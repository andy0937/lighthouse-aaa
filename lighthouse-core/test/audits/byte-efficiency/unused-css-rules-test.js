/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const UnusedCSSAudit = require('../../../audits/byte-efficiency/unused-css-rules.js');
const assert = require('assert');
const networkRecordsToDevtoolsLog = require('../../network-records-to-devtools-log.js');

/* eslint-env jest */

describe('Best Practices: unused css rules audit', () => {
  function generate(content, length) {
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(content);
    }
    return arr.join('');
  }

  describe('#determineContentPreview', () => {
    function assertLinesContained(actual, expected) {
      expected.split('\n').forEach(line => {
        assert.ok(actual.includes(line.trim()), `${line} is found in preview`);
      });
    }

    const preview = UnusedCSSAudit.determineContentPreview;

    it('correctly computes short content preview', () => {
      const shortContent = `
        html, body {
          background: green;
        }
      `.trim();

      assertLinesContained(preview(shortContent), shortContent);
    });

    it('correctly computes long content preview', () => {
      const longContent = `
        body {
          color: white;
        }

        html {
          content: '${generate('random', 50)}';
        }
      `.trim();

      assertLinesContained(preview(longContent), `
        body {
          color: white;
        } ...
      `.trim());
    });

    it('correctly computes long rule content preview', () => {
      const longContent = `
        body {
          color: white;
          font-size: 20px;
          content: '${generate('random', 50)}';
        }
      `.trim();

      assertLinesContained(preview(longContent), `
        body {
          color: white;
          font-size: 20px; ... } ...
      `.trim());
    });

    it('correctly computes long comment content preview', () => {
      const longContent = `
      /**
       * @license ${generate('a', 100)}
       */
      `.trim();

      assert.ok(/aaa\.\.\./.test(preview(longContent)));
    });
  });

  describe('#mapSheetToResult', () => {
    let baseSheet;
    const baseUrl = 'http://g.co/';

    function map(overrides, url = baseUrl) {
      if (overrides.header && overrides.header.sourceURL) {
        overrides.header.sourceURL = baseUrl + overrides.header.sourceURL;
      }
      return UnusedCSSAudit.mapSheetToResult(Object.assign(baseSheet, overrides), url);
    }

    beforeEach(() => {
      baseSheet = {
        header: {sourceURL: baseUrl},
        content: 'dummy',
        usedRules: [],
      };
    });

    it('correctly computes wastedBytes', () => {
      assert.equal(map({usedRules: []}).wastedPercent, 100);
      assert.equal(map({usedRules: [{startOffset: 0, endOffset: 3}]}).wastedPercent, 40);
      assert.equal(map({usedRules: [{startOffset: 0, endOffset: 5}]}).wastedPercent, 0);
    });

    it('correctly computes url', () => {
      const expectedPreview = 'dummy';
      assert.strictEqual(map({header: {sourceURL: ''}}).url, expectedPreview);
      assert.strictEqual(map({header: {sourceURL: 'a'}}, 'http://g.co/a').url, expectedPreview);
      assert.equal(map({header: {sourceURL: 'foobar'}}).url, 'http://g.co/foobar');
    });
  });

  describe('#audit', () => {
    const networkRecords = [
      {
        url: 'file://a.css',
        transferSize: 100 * 1024,
        resourceSize: 100 * 1024,
        resourceType: 'Stylesheet',
      },
    ];

    function getArtifacts({CSSUsage}) {
      return {
        devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
        URL: {finalUrl: ''},
        CSSUsage,
      };
    }

    it('ignores missing stylesheets', () => {
      return UnusedCSSAudit.audit_(getArtifacts({
        CSSUsage: {rules: [{styleSheetId: 'a', used: false}], stylesheets: []},
      }), networkRecords).then(result => {
        assert.equal(result.items.length, 0);
      });
    });

    it('ignores stylesheets that are 100% used', () => {
      return UnusedCSSAudit.audit_(getArtifacts({
        CSSUsage: {rules: [
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'b', used: true},
        ], stylesheets: [
          {
            header: {styleSheetId: 'a', sourceURL: 'file://a.css'},
            content: '.my.selector {color: #ccc;}\n a {color: #fff}',
          },
          {
            header: {styleSheetId: 'b', sourceURL: 'file://b.css'},
            content: '.my.favorite.selector { rule: content; }',
          },
        ]},
      }), networkRecords).then(result => {
        assert.equal(result.items.length, 0);
      });
    });

    it('fails when lots of rules are unused', () => {
      return UnusedCSSAudit.audit_(getArtifacts({
        CSSUsage: {rules: [
          {styleSheetId: 'a', used: true, startOffset: 0, endOffset: 11}, // 44 * 25% = 11
          {styleSheetId: 'b', used: true, startOffset: 0, endOffset: 60000}, // 40000 * 3 * 50% = 60000
        ], stylesheets: [
          {
            header: {styleSheetId: 'a', sourceURL: 'file://a.css'},
            content: '.my.selector {color: #ccc;}\n a {color: #fff}',
          },
          {
            header: {styleSheetId: 'b', sourceURL: 'file://b.css'},
            content: `${generate('123', 40000)}`,
          },
          {
            header: {styleSheetId: 'c', sourceURL: ''},
            content: `${generate('123', 450)}`, // will be filtered out
          },
        ]},
      }), networkRecords).then(result => {
        assert.equal(result.items.length, 2);
        assert.equal(result.items[0].totalBytes, 100 * 1024);
        assert.equal(result.items[1].totalBytes, 40000 * 3 * 0.2);
        assert.equal(result.items[0].wastedPercent, 75);
        assert.equal(result.items[1].wastedPercent, 50);
      });
    });

    it('handles phantom network records without size data', async () => {
      const result = await UnusedCSSAudit.audit_(getArtifacts({
        CSSUsage: {rules: [
          {styleSheetId: 'a', used: true, startOffset: 0, endOffset: 60000}, // 40000 * 3 * 50% = 60000
        ], stylesheets: [
          {
            header: {styleSheetId: 'a', sourceURL: 'file://a.html'},
            content: `${generate('123', 40000)}`, // stylesheet size of 40000 * 3 uncompressed bytes
          },
        ]},
      }), [
        {
          url: 'file://a.html',
          transferSize: 100 * 1024 * 0.5, // compression ratio of 0.5
          resourceSize: 100 * 1024,
          resourceType: 'Document', // this is a document so it'll use the compressionRatio but not the raw size
        },
        {
          url: 'file://a.html',
          transferSize: 0,
          resourceSize: 0,
          resourceType: 'Document',
        },
      ]);

      expect(result.items).toMatchObject([
        {totalBytes: 40000 * 3 * 0.5, wastedPercent: 50},
      ]);
    });

    it('does not include empty or small sheets', () => {
      return UnusedCSSAudit.audit_(getArtifacts({
        CSSUsage: {rules: [
          {styleSheetId: 'a', used: true, startOffset: 0, endOffset: 8000}, // 4000 * 3 / 2
          {styleSheetId: 'b', used: true, startOffset: 0, endOffset: 500}, // 500 * 3 / 3
        ], stylesheets: [
          {
            header: {styleSheetId: 'a', sourceURL: 'file://a.css'},
            content: `${generate('123', 4000)}`,
          },
          {
            header: {styleSheetId: 'b', sourceURL: 'file://b.css'},
            content: `${generate('123', 500)}`,
          },
          {
            header: {styleSheetId: 'c', sourceURL: 'file://c.css'},
            content: '@import url(http://googlefonts.com?myfont)',
          },
          {
            header: {styleSheetId: 'd', sourceURL: 'file://d.css'},
            content: '/* nothing to see here */',
          },
          {
            header: {styleSheetId: 'e', sourceURL: 'file://e.css'},
            content: '       ',
          },
        ]},
      }), networkRecords).then(result => {
        assert.equal(result.items.length, 1);
        assert.equal(Math.floor(result.items[0].wastedPercent), 33);
      });
    });
  });
});

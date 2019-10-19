/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const ManifestValues = require('../../computed/manifest-values.js');
const assert = require('assert');

const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const manifestParser = require('../../lib/manifest-parser.js');

function getMockContext() {
  return {
    computedCache: new Map(),
  };
}

/**
 * Simple manifest parsing helper when the manifest URLs aren't material to the
 * test. Uses example.com URLs for testing.
 * @param {string} manifestSrc
 * @return {!ManifestNode<(!Manifest|undefined)>}
 */
function noUrlManifestParser(manifestSrc) {
  const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
  const EXAMPLE_DOC_URL = 'https://example.com/index.html';

  return manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
}

describe('ManifestValues computed artifact', () => {
  it('reports a parse failure if page had no manifest', async () => {
    const manifestArtifact = null;
    const results = await ManifestValues.request(manifestArtifact, getMockContext());
    assert.equal(results.isParseFailure, true);
    assert.ok(results.parseFailureReason, 'No manifest was fetched');
    assert.equal(results.allChecks.length, 0);
  });

  it('reports a parse failure if page had an unparseable manifest', async () => {
    const manifestArtifact = noUrlManifestParser('{:,}');
    const results = await ManifestValues.request(manifestArtifact, getMockContext());
    assert.equal(results.isParseFailure, true);
    assert.ok(results.parseFailureReason.includes('failed to parse as valid JSON'));
    assert.equal(results.allChecks.length, 0);
  });

  it('passes the parsing checks on an empty manifest', async () => {
    const manifestArtifact = noUrlManifestParser('{}');
    const results = await ManifestValues.request(manifestArtifact, getMockContext());
    assert.equal(results.isParseFailure, false);
    assert.equal(results.parseFailureReason, undefined);
  });

  it('passes the all checks with fixture manifest', async () => {
    const manifestArtifact = noUrlManifestParser(manifestSrc);
    const results = await ManifestValues.request(manifestArtifact, getMockContext());
    assert.equal(results.isParseFailure, false);
    assert.equal(results.parseFailureReason, undefined);

    assert.equal(results.allChecks.length, ManifestValues.manifestChecks.length);
    assert.equal(results.allChecks.every(i => i.passing), true, 'not all checks passed');
  });

  describe('color checks', () => {
    it('fails when a minimal manifest contains no background_color', async () => {
      const WebAppManifest = noUrlManifestParser(JSON.stringify({
        start_url: '/',
      }));
      const results = await ManifestValues.request(WebAppManifest, getMockContext());
      const colorResults = results.allChecks.filter(i => i.id.includes('Color'));
      assert.equal(colorResults.every(i => i.passing === false), true);
    });

    it('fails when a minimal manifest contains an invalid background_color', async () => {
      const WebAppManifest = noUrlManifestParser(JSON.stringify({
        background_color: 'no',
        theme_color: 'no',
      }));

      const results = await ManifestValues.request(WebAppManifest, getMockContext());
      const colorResults = results.allChecks.filter(i => i.id.includes('Color'));
      assert.equal(colorResults.every(i => i.passing === false), true);
    });

    it('succeeds when a minimal manifest contains a valid background_color', async () => {
      const WebAppManifest = noUrlManifestParser(JSON.stringify({
        background_color: '#FAFAFA',
        theme_color: '#FAFAFA',
      }));

      const results = await ManifestValues.request(WebAppManifest, getMockContext());
      const colorResults = results.allChecks.filter(i => i.id.includes('Color'));
      assert.equal(colorResults.every(i => i.passing === true), true);
    });
  });

  describe('hasPWADisplayValue', () => {
    const check = ManifestValues.manifestChecks.find(i => i.id === 'hasPWADisplayValue');

    it('passes accepted values', () => {
      let WebAppManifest;
      WebAppManifest = noUrlManifestParser(JSON.stringify({display: 'minimal-ui'}));
      assert.equal(check.validate(WebAppManifest.value), true, 'doesnt pass minimal-ui');
      WebAppManifest = noUrlManifestParser(JSON.stringify({display: 'standalone'}));
      assert.equal(check.validate(WebAppManifest.value), true, 'doesnt pass standalone');
      WebAppManifest = noUrlManifestParser(JSON.stringify({display: 'fullscreen'}));
      assert.equal(check.validate(WebAppManifest.value), true, 'doesnt pass fullscreen');
    });
    it('fails invalid values', () => {
      let WebAppManifest;
      WebAppManifest = noUrlManifestParser(JSON.stringify({display: 'display'}));
      assert.equal(check.validate(WebAppManifest.value), false, 'doesnt fail display');
      WebAppManifest = noUrlManifestParser(JSON.stringify({display: ''}));
      assert.equal(check.validate(WebAppManifest.value), false, 'doesnt fail empty string');
    });
  });

  describe('icons checks', () => {
    describe('icons exist check', () => {
      it('fails when a manifest contains no icons array', async () => {
        const manifestSrc = JSON.stringify({
          name: 'NoIconsHere',
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const results = await ManifestValues.request(WebAppManifest, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));
        assert.equal(iconResults.every(i => i.passing === false), true);
      });

      it('fails when a manifest contains no icons', async () => {
        const manifestSrc = JSON.stringify({
          icons: [],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const results = await ManifestValues.request(WebAppManifest, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));
        assert.equal(iconResults.every(i => i.passing === false), true);
      });
    });

    describe('icons at least X size check', () => {
      it('fails when a manifest contains an icon with no size', async () => {
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon.png',
          }],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const results = await ManifestValues.request(WebAppManifest, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));

        assert.equal(iconResults.every(i => i.passing === false), true);
      });

      it('succeeds when there\'s one icon with multiple sizes, and one is valid', async () => {
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon.png',
            sizes: '72x72 96x96 128x128 256x256 1024x1024',
          }],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const results = await ManifestValues.request(WebAppManifest, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));

        assert.equal(iconResults.every(i => i.passing === true), true);
      });

      it('succeeds when there\'s two icons, one with and one without valid size', async () => {
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon.png',
          }, {
            src: 'icon2.png',
            sizes: '1256x1256',
          }],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const results = await ManifestValues.request(WebAppManifest, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));

        assert.equal(iconResults.every(i => i.passing === true), true);
      });

      it('fails when an icon has a valid size, though it\'s non-square.', async () => {
        // See also: https://code.google.com/p/chromium/codesearch#chromium/src/chrome/browser/banners/app_banner_data_fetcher_unittest.cc&sq=package:chromium&type=cs&q=%22Non-square%20is%20okay%22%20file:%5Esrc/chrome/browser/banners/
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon-non-square.png',
            sizes: '200x220',
          }],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const results = await ManifestValues.request(WebAppManifest, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));

        assert.equal(iconResults.every(i => i.passing === false), true);
      });
    });
  });
});

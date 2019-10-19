/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const URL = require('../../lib/url-shim.js');
const assert = require('assert');
const superLongName =
    'https://example.com/thisIsASuperLongURLThatWillTriggerFilenameTruncationWhichWeWantToTest.js';

describe('URL Shim', () => {
  it('handles URLs beginning with multiple digits', () => {
    // from https://github.com/GoogleChrome/lighthouse/issues/1186
    const url = 'http://5321212.fls.doubleclick.net/activityi;src=5321212;type=unvsn_un;cat=unvsn_uv;ord=7762287885264.98?';
    assert.doesNotThrow(_ => new URL(url));
  });

  it.skip('handles URLs with multiple dashes', () => {
    // from https://github.com/GoogleChrome/lighthouse/issues/1972
    const url = 'https://r15---sn-o097znl7.googlevideo.com/generate_204?conn2';
    assert.doesNotThrow(_ => new URL(url));
  });

  it('safely identifies valid URLs', () => {
    assert.ok(URL.isValid('https://5321212.fls.net/page?query=string#hash'));
    assert.ok(URL.isValid('https://localhost:8080/page?query=string#hash'));
    assert.ok(URL.isValid('https://google.co.uk/deep/page?query=string#hash'));
  });

  it('safely identifies invalid URLs', () => {
    assert.equal(URL.isValid(''), false);
    assert.equal(URL.isValid('eval(<context>):45:16'), false);
  });

  it('safely identifies allowed URL protocols', () => {
    assert.ok(URL.isProtocolAllowed('http://google.com/'));
    assert.ok(URL.isProtocolAllowed('https://google.com/'));
    assert.ok(URL.isProtocolAllowed('chrome://version'));
    assert.ok(URL.isProtocolAllowed('chrome-extension://blipmdconlkpinefehnmjammfjpmpbjk/popup.html'));
  });

  it('safely identifies disallowed URL protocols', () => {
    assert.equal(URL.isProtocolAllowed('file:///i/am/a/fake/file.html'), false);
    assert.equal(URL.isProtocolAllowed('ftp://user:password@private.ftp.example.com/index.html'), false);
    assert.equal(URL.isProtocolAllowed('gopher://underground:9090/path'), false);
  });

  it('safely identifies same hosts', () => {
    const urlA = 'https://5321212.fls.net/page?query=string#hash';
    const urlB = 'http://5321212.fls.net/deeply/nested/page';
    assert.ok(URL.hostsMatch(urlA, urlB));
  });

  it('safely identifies different hosts', () => {
    const urlA = 'https://google.com/page?query=string#hash';
    const urlB = 'http://google.co.uk/deeply/nested/page';
    assert.equal(URL.hostsMatch(urlA, urlB), false);
  });

  it('safely identifies invalid hosts', () => {
    const urlA = 'https://google.com/page?query=string#hash';
    const urlB = 'anonymous:45';
    assert.equal(URL.hostsMatch(urlA, urlB), false);
  });

  it('safely identifies same origins', () => {
    const urlA = 'https://5321212.fls.net/page?query=string#hash';
    const urlB = 'https://5321212.fls.net/deeply/nested/page';
    assert.ok(URL.originsMatch(urlA, urlB));
  });

  it('safely identifies different origins', () => {
    const urlA = 'https://5321212.fls.net/page?query=string#hash';
    const urlB = 'http://5321212.fls.net/deeply/nested/page';
    assert.equal(URL.originsMatch(urlA, urlB), false);
  });

  it('safely identifies different invalid origins', () => {
    const urlA = 'https://google.com/page?query=string#hash';
    const urlB = 'anonymous:90';
    assert.equal(URL.originsMatch(urlA, urlB), false);
  });

  it('safely gets valid origins', () => {
    const urlA = 'https://google.com/page?query=string#hash';
    const urlB = 'https://5321212.fls.net/page?query=string#hash';
    const urlC = 'http://example.com/deeply/nested/page';
    assert.equal(URL.getOrigin(urlA), 'https://google.com');
    assert.equal(URL.getOrigin(urlB), 'https://5321212.fls.net');
    assert.equal(URL.getOrigin(urlC), 'http://example.com');
  });

  it('safely gets URLs with no origin', () => {
    const urlA = 'data:image/jpeg;base64,foobar';
    const urlB = 'anonymous:90';
    const urlC = '!!garbage';
    const urlD = 'file:///opt/lighthouse/index.js';
    assert.equal(URL.getOrigin(urlA), null);
    assert.equal(URL.getOrigin(urlB), null);
    assert.equal(URL.getOrigin(urlC), null);
    assert.equal(URL.getOrigin(urlD), null);
  });

  describe('rootDomainsMatch', () => {
    it('matches a subdomain and a root domain', () => {
      const urlA = 'http://example.com/js/test.js';
      const urlB = 'http://example.com/';
      const urlC = 'http://sub.example.com/js/test.js';
      const urlD = 'http://sub.otherdomain.com/js/test.js';

      assert.ok(URL.rootDomainsMatch(urlA, urlB));
      assert.ok(URL.rootDomainsMatch(urlA, urlC));
      assert.ok(!URL.rootDomainsMatch(urlA, urlD));
      assert.ok(!URL.rootDomainsMatch(urlB, urlD));
    });

    it(`doesn't break on urls without a valid host`, () => {
      const urlA = 'http://example.com/js/test.js';
      const urlB = 'data:image/jpeg;base64,foobar';
      const urlC = 'anonymous:90';
      const urlD = '!!garbage';
      const urlE = 'file:///opt/lighthouse/index.js';

      assert.ok(!URL.rootDomainsMatch(urlA, urlB));
      assert.ok(!URL.rootDomainsMatch(urlA, urlC));
      assert.ok(!URL.rootDomainsMatch(urlA, urlD));
      assert.ok(!URL.rootDomainsMatch(urlA, urlE));
      assert.ok(!URL.rootDomainsMatch(urlB, urlC));
      assert.ok(!URL.rootDomainsMatch(urlB, urlD));
      assert.ok(!URL.rootDomainsMatch(urlB, urlE));
    });

    it(`matches tld plus domains`, () => {
      const coUkA = 'http://example.co.uk/js/test.js';
      const coUkB = 'http://sub.example.co.uk/js/test.js';
      const testUkA = 'http://example.test.uk/js/test.js';
      const testUkB = 'http://sub.example.test.uk/js/test.js';
      const ltdBrA = 'http://example.ltd.br/js/test.js';
      const ltdBrB = 'http://sub.example.ltd.br/js/test.js';
      const privAtA = 'http://examplepriv.at/js/test.js';
      const privAtB = 'http://sub.examplepriv.at/js/test.js';

      assert.ok(URL.rootDomainsMatch(coUkA, coUkB));
      assert.ok(URL.rootDomainsMatch(testUkA, testUkB));
      assert.ok(URL.rootDomainsMatch(ltdBrA, ltdBrB));
      assert.ok(URL.rootDomainsMatch(privAtA, privAtB));
    });
  });

  describe('getURLDisplayName', () => {
    it('respects numPathParts option', () => {
      const url = 'http://example.com/a/deep/nested/file.css';
      const result = URL.getURLDisplayName(url, {numPathParts: 3});
      assert.equal(result, '\u2026deep/nested/file.css');
    });

    it('respects preserveQuery option', () => {
      const url = 'http://example.com/file.css?aQueryString=true';
      const result = URL.getURLDisplayName(url, {preserveQuery: false});
      assert.equal(result, '/file.css');
    });

    it('respects preserveHost option', () => {
      const url = 'http://example.com/file.css';
      const result = URL.getURLDisplayName(url, {preserveHost: true});
      assert.equal(result, 'example.com/file.css');
    });

    it('Elides hashes', () => {
      const url = 'http://example.com/file-f303dec6eec305a4fab8025577db3c2feb418148ac75ba378281399fb1ba670b.css';
      const result = URL.getURLDisplayName(url);
      assert.equal(result, '/file-f303dec\u2026.css');
    });

    it('Elides hashes in the middle', () => {
      const url = 'http://example.com/file-f303dec6eec305a4fab80378281399fb1ba670b-somethingmore.css';
      const result = URL.getURLDisplayName(url);
      assert.equal(result, '/file-f303dec\u2026-somethingmore.css');
    });

    it('Elides google-fonts hashes', () => {
      const url = 'https://fonts.gstatic.com/s/droidsans/v8/s-BiyweUPV0v-yRb-cjciAzyDMXhdD8sAj6OAJTFsBI.woff2';
      const result = URL.getURLDisplayName(url);
      assert.equal(result, '\u2026v8/s-BiyweUP\u2026.woff2');
    });

    it('Elides long number sequences', () => {
      const url = 'http://cdn.cnn.com/cnnnext/dam/assets/150507173438-11-week-in-photos-0508-large-169.jpg';
      const result = URL.getURLDisplayName(url);
      assert.equal(result, '\u2026assets/150\u2026-11-week-in-photos-0508-large-169.jpg');
    });


    it('Elides query strings when can first parameter', () => {
      const url = 'http://example.com/file.css?aQueryString=true&other_long_query_stuff=false&some_other_super_long_query';
      const result = URL.getURLDisplayName(url);
      assert.equal(result, '/file.css?aQueryString=\u2026');
    });

    it('Elides query strings when cannot preserve first parameter', () => {
      const url = 'http://example.com/file.css?superDuperNoGoodVeryLongExtraSpecialOnlyTheBestEnourmousQueryString=true';
      const result = URL.getURLDisplayName(url);
      assert.equal(result, '/file.css?\u2026');
    });

    it('Elides long names', () => {
      const result = URL.getURLDisplayName(superLongName);
      const expected = '/thisIsASuperLongURLThatWillTriggerFilenameTruncationWhichWe\u2026.js';
      assert.equal(result, expected);
    });

    it('Elides long names with hash', () => {
      const url = superLongName.slice(0, -3) +
          '-f303dec6eec305a4fab8025577db3c2feb418148ac75ba378281399fb1ba670b.css';
      const result = URL.getURLDisplayName(url);
      const expected = '/thisIsASu\u2026.css';
      assert.equal(result, expected);
    });

    it('Elides path parts properly', () => {
      assert.equal(URL.getURLDisplayName('http://example.com/file.css'), '/file.css');
      assert.equal(URL.getURLDisplayName('http://t.co//file.css'), '//file.css');
      assert.equal(URL.getURLDisplayName('http://t.co/a/file.css'), '/a/file.css');
      assert.equal(URL.getURLDisplayName('http://t.co/a/b/file.css'), '\u2026b/file.css');
    });

    it('Elides path parts properly when used with preserveHost', () => {
      const getResult = path => URL.getURLDisplayName(`http://g.co${path}`, {preserveHost: true});
      assert.equal(getResult('/file.css'), 'g.co/file.css');
      assert.equal(getResult('/img/logo.jpg'), 'g.co/img/logo.jpg');
      assert.equal(getResult('//logo.jpg'), 'g.co//logo.jpg');
      assert.equal(getResult('/a/b/logo.jpg'), 'g.co/\u2026b/logo.jpg');
    });
  });

  describe('elideDataURI', () => {
    it('elides long data URIs', () => {
      let longDataURI = '';
      for (let i = 0; i < 1000; i++) {
        longDataURI += 'abcde';
      }

      const elided = URL.elideDataURI(`data:image/jpeg;base64,${longDataURI}`);
      assert.ok(elided.length < longDataURI.length, 'did not shorten string');
    });

    it('returns all other inputs', () => {
      const urls = [
        'data:image/jpeg;base64,foobar',
        'https://example.com/page?query=string#hash',
        'http://example-2.com',
        'chrome://settings',
        'blob://something',
      ];

      urls.forEach(url => assert.equal(URL.elideDataURI(url), url));
    });
  });

  describe('equalWithExcludedFragments', () => {
    it('correctly checks equality of URLs regardless of fragment', () => {
      const equalPairs = [
        ['https://example.com/', 'https://example.com/'],
        ['https://example.com/', 'https://example.com/#/login?_k=dt915a'],
        ['https://example.com/', 'https://example.com#anchor'],
      ];
      equalPairs.forEach(pair => assert.ok(URL.equalWithExcludedFragments(...pair)));
    });

    it('correctly checks inequality of URLs regardless of fragment', () => {
      const unequalPairs = [
        ['https://example.com/', 'https://www.example.com/'],
        ['https://example.com/', 'http://example.com/'],
        ['https://example.com/#/login?_k=dt915a', 'https://example.com/index.html#/login?_k=dt915a'],
        ['https://example.com#anchor', 'https://example.com?t=1#anchor'],
      ];
      unequalPairs.forEach(pair => assert.ok(!URL.equalWithExcludedFragments(...pair)));
    });

    // Bug #1776
    it('rewrites chrome://settings urls', () => {
      const pair = [
        'chrome://settings/',
        'chrome://chrome/settings/',
      ];
      assert.ok(URL.equalWithExcludedFragments(...pair));
    });

    // https://github.com/GoogleChrome/lighthouse/pull/3941#discussion_r154026009
    it('canonicalizes chrome:// urls without a trailing slash', () => {
      const pair = [
        'chrome://version/',
        'chrome://version',
      ];
      assert.ok(URL.equalWithExcludedFragments(...pair));
    });

    it('returns false for invalid URLs', () => {
      assert.ok(!URL.equalWithExcludedFragments('utter nonsense', 'http://example.com'));
    });
  });
});

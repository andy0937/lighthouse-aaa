/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */
const BootupTime = require('../../audits/bootup-time.js');
const assert = require('assert');

const acceptableTrace = require('../fixtures/traces/progressive-app-m60.json');
const acceptableDevtoolsLogs = require('../fixtures/traces/progressive-app-m60.devtools.log.json');
const errorTrace = require('../fixtures/traces/no_fmp_event.json');

describe('Performance: bootup-time audit', () => {
  const auditOptions = Object.assign({}, BootupTime.defaultOptions, {thresholdInMs: 10});
  const roundedValueOf = (output, url) => {
    const value = output.details.items.find(item => item.url === url);
    const roundedValue = {};
    Object.keys(value).forEach(key => roundedValue[key] = Math.round(value[key] * 10) / 10);
    delete roundedValue.url;
    return roundedValue;
  };

  it('should compute the correct BootupTime values', () => {
    const artifacts = Object.assign({
      traces: {[BootupTime.DEFAULT_PASS]: acceptableTrace},
      devtoolsLogs: {[BootupTime.DEFAULT_PASS]: acceptableDevtoolsLogs},
    });
    const computedCache = new Map();

    return BootupTime.audit(artifacts, {options: auditOptions, computedCache}).then(output => {
      assert.deepEqual(roundedValueOf(output, 'https://pwa.rocks/script.js'), {scripting: 31.8, scriptParseCompile: 1.3, total: 36.8});
      assert.deepEqual(roundedValueOf(output, 'https://www.googletagmanager.com/gtm.js?id=GTM-Q5SW'), {scripting: 97.2, scriptParseCompile: 6.5, total: 104.7});
      assert.deepEqual(roundedValueOf(output, 'https://www.google-analytics.com/plugins/ua/linkid.js'), {scripting: 25.2, scriptParseCompile: 1.2, total: 26.4});
      assert.deepEqual(roundedValueOf(output, 'https://www.google-analytics.com/analytics.js'), {scripting: 40.6, scriptParseCompile: 9.6, total: 53.4});
      assert.deepEqual(roundedValueOf(output, 'Other'), {scripting: 11.7, scriptParseCompile: 0, total: 1123.8}); // eslint-disable-line max-len

      assert.equal(Math.round(output.numericValue), 225);
      assert.equal(output.details.items.length, 5);
      assert.equal(output.score, 1);
    });
  }, 10000);

  it('should compute the correct values when simulated', async () => {
    const artifacts = Object.assign({
      traces: {defaultPass: acceptableTrace},
      devtoolsLogs: {defaultPass: acceptableDevtoolsLogs},
    });

    const options = auditOptions;
    const settings = {throttlingMethod: 'simulate', throttling: {cpuSlowdownMultiplier: 3}};
    const computedCache = new Map();
    const output = await BootupTime.audit(artifacts, {options, settings, computedCache});

    assert.deepEqual(roundedValueOf(output, 'https://pwa.rocks/script.js'), {scripting: 95.3, scriptParseCompile: 3.9, total: 110.5});

    assert.equal(output.details.items.length, 8);
    assert.equal(output.score, 0.98);
    assert.equal(Math.round(output.numericValue), 720);
  });

  it('should get no data when no events are present', () => {
    const artifacts = Object.assign({
      traces: {defaultPass: errorTrace},
      devtoolsLogs: {defaultPass: []},
    });
    const computedCache = new Map();

    return BootupTime.audit(artifacts, {options: auditOptions, computedCache})
      .then(output => {
        assert.equal(output.details.items.length, 0);
        assert.equal(output.score, 1);
        assert.equal(Math.round(output.numericValue), 0);
      });
  });
});

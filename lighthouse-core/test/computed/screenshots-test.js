/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */
const Screenshots = require('../../computed/screenshots.js');
const assert = require('assert');
const pwaTrace = require('../fixtures/traces/progressive-app.json');

describe('Screenshot computed artifact', () => {
  it('returns an artifact for a real trace', () => {
    const context = {computedCache: new Map()};
    return Screenshots.request({traceEvents: pwaTrace}, context).then(screenshots => {
      assert.ok(Array.isArray(screenshots));
      assert.equal(screenshots.length, 7);

      const firstScreenshot = screenshots[0];
      assert.ok(firstScreenshot.datauri.startsWith('data:image/jpeg;base64,'));
      assert.ok(firstScreenshot.datauri.length > 42);
    });
  });
});

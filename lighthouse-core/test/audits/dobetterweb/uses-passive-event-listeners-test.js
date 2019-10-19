/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const PassiveEventsAudit = require('../../../audits/dobetterweb/uses-passive-event-listeners.js');
const assert = require('assert');

/* eslint-env jest */

describe('Page uses passive events listeners where applicable', () => {
  it('fails when scroll blocking listeners should be passive', () => {
    const text = 'Use passive event listeners when you do not use preventDefault';

    const auditResult = PassiveEventsAudit.audit({
      ConsoleMessages: [
        {entry: {source: 'violation', url: 'https://example.com/', text}},
        {entry: {source: 'violation', url: 'https://example2.com/two', text}},
        {entry: {source: 'violation', url: 'https://example2.com/two', text}}, // duplicate
        {entry: {source: 'violation', url: 'http://abc.com/', text: 'No document.write'}},
        {entry: {source: 'deprecation', url: 'https://example.com/two'}},
      ],
    });

    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.extendedInfo.value.length, 2);
  });

  it('passes scroll blocking listeners should be passive', () => {
    const auditResult = PassiveEventsAudit.audit({
      ConsoleMessages: [],
    });
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.extendedInfo.value.length, 0);
  });
});

/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const ErrorLogsAudit = require('../../audits/errors-in-console.js');
const assert = require('assert');

describe('Console error logs audit', () => {
  it('passes when no console messages were found', () => {
    const auditResult = ErrorLogsAudit.audit({
      ConsoleMessages: [],
      RuntimeExceptions: [],
    });
    assert.equal(auditResult.numericValue, 0);
    assert.equal(auditResult.score, 1);
    assert.ok(!auditResult.displayValue, 0);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('filter out the non error logs', () => {
    const auditResult = ErrorLogsAudit.audit({
      ConsoleMessages: [
        {
          entry: {
            level: 'info',
            source: 'network',
            text: 'This is a simple info msg',
          },
        },
      ],
      RuntimeExceptions: [],
    });
    assert.equal(auditResult.numericValue, 0);
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('fails when error logs are found ', () => {
    const auditResult = ErrorLogsAudit.audit({
      ConsoleMessages: [
        {
          entry: {
            level: 'error',
            source: 'network',
            text: 'The server responded with a status of 404 (Not Found)',
            url: 'http://www.example.com/favicon.ico',
          },
        }, {
          entry: {
            level: 'error',
            source: 'network',
            text: 'WebSocket connection failed: Unexpected response code: 500',
            url: 'http://www.example.com/wsconnect.ws',
          },
        },
      ],
      RuntimeExceptions: [{
        'timestamp': 1506535813608.003,
        'exceptionDetails': {
          'url': 'http://example.com/fancybox.js',
          'stackTrace': {
            'callFrames': [
              {
                'url': 'http://example.com/fancybox.js',
                'lineNumber': 28,
                'columnNumber': 20,
              },
            ],
          },
          'exception': {
            'className': 'TypeError',
            'description': 'TypeError: Cannot read property \'msie\' of undefined',
          },
          'executionContextId': 3,
        },
      }],
    });

    assert.equal(auditResult.numericValue, 3);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 3);
    assert.equal(auditResult.details.items[0].url, 'http://www.example.com/favicon.ico');
    assert.equal(auditResult.details.items[0].description,
      'The server responded with a status of 404 (Not Found)');
    assert.equal(auditResult.details.items[1].url, 'http://www.example.com/wsconnect.ws');
    assert.equal(auditResult.details.items[1].description,
      'WebSocket connection failed: Unexpected response code: 500');
    assert.equal(auditResult.details.items[2].url,
      'http://example.com/fancybox.js');
    assert.equal(auditResult.details.items[2].description,
      'TypeError: Cannot read property \'msie\' of undefined');
  });

  it('handle the case when some logs fields are undefined', () => {
    const auditResult = ErrorLogsAudit.audit({
      ConsoleMessages: [
        {
          entry: {
            level: 'error',
          },
        },
      ],
      RuntimeExceptions: [],
    });
    assert.equal(auditResult.numericValue, 1);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 1);
    // url is undefined
    assert.strictEqual(auditResult.details.items[0].url, undefined);
    // text is undefined
    assert.strictEqual(auditResult.details.items[0].description, undefined);
  });

  // Checks bug #4188
  it('handle the case when exception info is not present', () => {
    const auditResult = ErrorLogsAudit.audit({
      ConsoleMessages: [],
      RuntimeExceptions: [{
        'timestamp': 1506535813608.003,
        'exceptionDetails': {
          'url': 'http://example.com/fancybox.js',
          'text': 'TypeError: Cannot read property \'msie\' of undefined',
          'stackTrace': {
            'callFrames': [
              {
                'url': 'http://example.com/fancybox.js',
                'lineNumber': 28,
                'columnNumber': 20,
              },
            ],
          },
          'executionContextId': 3,
        },
      }],
    });
    assert.equal(auditResult.numericValue, 1);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 1);
    assert.strictEqual(auditResult.details.items[0].url, 'http://example.com/fancybox.js');
    assert.strictEqual(auditResult.details.items[0].description,
      'TypeError: Cannot read property \'msie\' of undefined');
  });
});

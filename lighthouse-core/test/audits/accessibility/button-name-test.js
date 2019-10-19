/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../../audits/accessibility/button-name.js');
const assert = require('assert');

/* eslint-env jest */

describe('Accessibility: button-name audit', () => {
  it('generates an audit output', () => {
    const artifacts = {
      Accessibility: {
        violations: [{
          id: 'button-name',
          nodes: [],
          help: 'http://example.com/',
        }],
      },
    };

    const output = Audit.audit(artifacts);
    assert.equal(output.score, 0);
  });

  it('generates an audit output (single node)', () => {
    const artifacts = {
      Accessibility: {
        violations: [{
          id: 'button-name',
          nodes: [{}],
          help: 'http://example.com/',
        }],
      },
    };

    const output = Audit.audit(artifacts);
    assert.equal(output.score, 0);
  });
});

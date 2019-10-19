/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const ViewportDimensionsGatherer = require('../../../gather/gatherers/viewport-dimensions.js');
const assert = require('assert');
let gatherer;

describe('ViewportDimensions gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    gatherer = new ViewportDimensionsGatherer();
  });

  it('returns an artifact', () => {
    return gatherer.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve({
            innerWidth: 400,
            outerWidth: 400,
            innerHeight: 600,
            outerHeight: 600,
            devicePixelRatio: 2,
          });
        },
      },
    }).then(artifact => {
      assert.ok(typeof artifact === 'object');
      assert.ok(artifact.outerWidth === 400);
      assert.ok(artifact.innerHeight === 600);
    });
  });
});

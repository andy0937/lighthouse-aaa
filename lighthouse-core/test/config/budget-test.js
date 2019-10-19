/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Budget = require('../../config/budget.js');
const assert = require('assert');
/* eslint-env jest */

describe('Budget', () => {
  let budgets;
  beforeEach(() => {
    budgets = [
      {
        resourceSizes: [
          {
            resourceType: 'script',
            budget: 123,
          },
          {
            resourceType: 'image',
            budget: 456,
          },
        ],
        resourceCounts: [
          {
            resourceType: 'total',
            budget: 100,
          },
          {
            resourceType: 'third-party',
            budget: 10,
          },
        ],
        timings: [
          {
            metric: 'interactive',
            budget: 2000,
            tolerance: 1000,
          },
          {
            metric: 'first-contentful-paint',
            budget: 1000,
            // tolerance is optional, so not defined here.
          },
        ],
      },
      {
        path: '/second-path',
        resourceSizes: [
          {
            resourceType: 'script',
            budget: 1000,
          },
        ],
      },
    ];
  });

  it('initializes correctly', () => {
    const result = Budget.initializeBudget(budgets);
    assert.equal(result.length, 2);

    // Missing paths are not overwritten
    assert.equal(result[0].path, undefined);
    // Sets path correctly
    assert.equal(result[1].path, '/second-path');

    // Sets resources sizes correctly
    assert.equal(result[0].resourceSizes.length, 2);
    assert.equal(result[0].resourceSizes[0].resourceType, 'script');
    assert.equal(result[0].resourceSizes[0].budget, 123);

    // Sets resource counts correctly
    assert.equal(result[0].resourceCounts.length, 2);
    assert.equal(result[0].resourceCounts[0].resourceType, 'total');
    assert.equal(result[0].resourceCounts[0].budget, 100);

    // Sets timings correctly
    assert.equal(result[0].timings.length, 2);
    assert.deepStrictEqual(result[0].timings[0], {
      metric: 'interactive',
      budget: 2000,
      tolerance: 1000,
    });
    assert.deepStrictEqual(result[0].timings[1], {
      metric: 'first-contentful-paint',
      budget: 1000,
      tolerance: undefined,
    });

    // Does not set unsupplied result
    assert.equal(result[1].timings, null);
  });

  it('accepts an empty array', () => {
    const result = Budget.initializeBudget([]);
    assert.deepStrictEqual(result, []);
  });

  it('throws error if an unsupported budget property is used', () => {
    budgets[0].sizes = [];
    assert.throws(_ => Budget.initializeBudget(budgets),
      /Budget has unrecognized properties: \[sizes\]/);
  });

  describe('top-level validation', () => {
    it('throws when provided an invalid budget array', () => {
      assert.throws(_ => Budget.initializeBudget(55),
        /Budget file is not defined as an array of/);

      assert.throws(_ => Budget.initializeBudget(['invalid123']),
        /Budget file is not defined as an array of/);

      assert.throws(_ => Budget.initializeBudget([null]),
        /Budget file is not defined as an array of/);
    });

    it('throws when budget contains invalid resourceSizes entry', () => {
      budgets[0].resourceSizes = 55;
      assert.throws(_ => Budget.initializeBudget(budgets),
        /^Error: Invalid resourceSizes entry in budget at index 0$/);
    });

    it('throws when budget contains invalid resourceCounts entry', () => {
      budgets[0].resourceCounts = 'A string';
      assert.throws(_ => Budget.initializeBudget(budgets),
        /^Error: Invalid resourceCounts entry in budget at index 0$/);
    });

    it('throws when budget contains invalid timings entry', () => {
      budgets[1].timings = false;
      assert.throws(_ => Budget.initializeBudget(budgets),
        /^Error: Invalid timings entry in budget at index 1$/);
    });
  });

  describe('resource budget validation', () => {
    it('throws when an invalid resource type is supplied', () => {
      budgets[0].resourceSizes[0].resourceType = 'movies';
      assert.throws(_ => Budget.initializeBudget(budgets),
        // eslint-disable-next-line max-len
        /Invalid resource type: movies. \nValid resource types are: total, document,/);
    });

    it('throws when an invalid budget is supplied', () => {
      budgets[0].resourceSizes[0].budget = '100 MB';
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid budget: 100 MB/);
    });

    it('throws when an invalid property is supplied', () => {
      budgets[0].resourceSizes[0].browser = 'Chrome';
      assert.throws(_ => Budget.initializeBudget(budgets),
        /Resource Budget has unrecognized properties: \[browser\]/);
    });

    it('throws when a duplicate resourceType is specified in resourceSizes', () => {
      budgets[1].resourceSizes.push({resourceType: 'script', budget: 100});
      assert.throws(_ => Budget.initializeBudget(budgets),
        /has duplicate entry of type 'script'/);
    });

    it('throws when a duplicate resourceType is specified in resourceCounts', () => {
      budgets[0].resourceCounts.push({resourceType: 'third-party', budget: 100});
      assert.throws(_ => Budget.initializeBudget(budgets),
        /has duplicate entry of type 'third-party'/);
    });
  });

  describe('timing budget validation', () => {
    it('throws when an invalid metric is supplied', () => {
      budgets[0].timings[0].metric = 'medianMeaningfulPaint';
      assert.throws(_ => Budget.initializeBudget(budgets),
        // eslint-disable-next-line max-len
        /Invalid timing metric: medianMeaningfulPaint. \nValid timing metrics are: first-contentful-paint, /);
    });

    it('throws when an invalid budget is supplied', () => {
      budgets[0].timings[0].budget = '100KB';
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid budget: 100KB/);
    });

    it('throws when an invalid tolerance is supplied', () => {
      budgets[0].timings[0].tolerance = '100ms';
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid tolerance: 100ms/);
    });

    it('throws when an invalid property is supplied', () => {
      budgets[0].timings[0].device = 'Phone';
      budgets[0].timings[0].location = 'The middle somewhere, I don\'t know';
      assert.throws(_ => Budget.initializeBudget(budgets),
        /Timing Budget has unrecognized properties: \[device, location\]/);
    });

    it('throws when a duplicate metric type is specified in timings', () => {
      budgets[0].timings.push({metric: 'interactive', budget: 1000});
      assert.throws(_ => Budget.initializeBudget(budgets),
        /has duplicate entry of type 'interactive'/);
    });
  });

  describe('path validation', () => {
    it('recognizes valid budgets', () => {
      let budgets = [{path: '/'}];
      let result = Budget.initializeBudget(budgets);
      assert.equal(budgets[0].path, result[0].path);

      budgets = [{path: '/*'}];
      result = Budget.initializeBudget(budgets);
      assert.equal(budgets[0].path, result[0].path);

      budgets = [{path: '/end$'}];
      result = Budget.initializeBudget(budgets);
      assert.equal(budgets[0].path, result[0].path);

      budgets = [{path: '/fish*.php'}];
      result = Budget.initializeBudget(budgets);
      assert.equal(budgets[0].path, result[0].path);

      budgets = [{path: '/*.php$'}];
      result = Budget.initializeBudget(budgets);
      assert.equal(budgets[0].path, result[0].path);
    });

    it('invalidates paths missing leading "/"', () => {
      let budgets = [{path: ''}];
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid path/);

      budgets = [{path: 'cat'}];
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid path/);
    });

    it('invalidates paths with multiple * characters', () => {
      budgets = [{path: '/cat*cat*cat'}];
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid path/);
    });

    it('invalidates paths with multiple $ characters', () => {
      budgets = [{path: '/cat$cat$'}];
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid path/);
    });

    it('invalidates paths with $ character in the wrong location', () => {
      budgets = [{path: '/cat$html'}];
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid path/);
    });

    it('does not throw if no path is specified', () => {
      const budgets = [{}];
      const result = Budget.initializeBudget(budgets);
      assert.equal(result[0].path, undefined);
    });
  });

  describe('path matching', () => {
    const pathMatch = (path, pattern) => {
      const origin = 'https://example.com';
      return Budget.urlMatchesPattern(origin + path, pattern);
    };

    it('matches root', () => {
      assert.ok(Budget.urlMatchesPattern('https://google.com', '/'));
    });

    it('ignores origin', () => {
      assert.equal(Budget.urlMatchesPattern('https://go.com/dogs', '/go'), false);
      assert.equal(Budget.urlMatchesPattern('https://yt.com/videos?id=', '/videos'), true);
    });

    it('is case-sensitive', () => {
      assert.equal(Budget.urlMatchesPattern('https://abc.com/aaa', '/aaa'), true);
      assert.equal(Budget.urlMatchesPattern('https://abc.com/AAA', '/aaa'), false);
      assert.equal(Budget.urlMatchesPattern('https://abc.com/aaa', '/AAA'), false);
    });

    it('matches all pages if path is not defined', () => {
      assert.ok(Budget.urlMatchesPattern('https://example.com', undefined), true);
      assert.ok(Budget.urlMatchesPattern('https://example.com/dogs', undefined), true);
    });

    it('handles patterns that do not contain * or $', () => {
      assert.equal(pathMatch('/anything', '/'), true);
      assert.equal(pathMatch('/anything', '/any'), true);
      assert.equal(pathMatch('/anything', '/anything'), true);
      assert.equal(pathMatch('/anything', '/anything1'), false);
    });

    it('handles patterns that do not contain * but contain $', () => {
      assert.equal(pathMatch('/fish.php', '/fish.php$'), true);
      assert.equal(pathMatch('/Fish.PHP', '/fish.php$'), false);
    });

    it('handles patterns that contain * but do not contain $', () => {
      assert.equal(pathMatch('/anything', '/*'), true);
      assert.equal(pathMatch('/fish', '/fish*'), true);
      assert.equal(pathMatch('/fishfood', '/*food'), true);
      assert.equal(pathMatch('/fish/food/and/other/things', '/*food'), true);
      assert.equal(pathMatch('/fis/', '/fish*'), false);
      assert.equal(pathMatch('/fish', '/fish*fish'), false);
    });

    it('handles patterns that contain * and $', () => {
      assert.equal(pathMatch('/fish.php', '/*.php$'), true);
      assert.equal(pathMatch('/folder/filename.php', '/folder*.php$'), true);
      assert.equal(pathMatch('/folder/filename.php', '/folder/filename*.php$'), true);
      assert.equal(pathMatch('/fish.php?species=', '/*.php$'), false);
      assert.equal(pathMatch('/filename.php/', '/folder*.php$'), false);
      assert.equal(pathMatch('/folder', '/folder*folder$'), false);
    });
  });
});

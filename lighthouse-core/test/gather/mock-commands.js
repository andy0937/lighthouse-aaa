/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Refer to driver-test.js and source-maps-test.js for intended usage.
 */

/* eslint-env jest */

/**
 * Creates a jest mock function whose implementation consumes mocked protocol responses matching the
 * requested command in the order they were mocked.
 *
 * It is decorated with two methods:
 *    - `mockResponse` which pushes protocol message responses for consumption
 *    - `findInvocation` which asserts that `sendCommand` was invoked with the given command and
 *      returns the protocol message argument.
 */
function createMockSendCommandFn() {
  const mockResponses = [];
  const mockFn = jest.fn().mockImplementation((command, ...args) => {
    const indexOfResponse = mockResponses.findIndex(entry => entry.command === command);
    if (indexOfResponse === -1) throw new Error(`${command} unimplemented`);
    const {response, delay} = mockResponses[indexOfResponse];
    mockResponses.splice(indexOfResponse, 1);
    const returnValue = typeof response === 'function' ? response(...args) : response;
    if (delay) return new Promise(resolve => setTimeout(() => resolve(returnValue), delay));
    return Promise.resolve(returnValue);
  });

  mockFn.mockResponse = (command, response, delay) => {
    mockResponses.push({command, response, delay});
    return mockFn;
  };

  mockFn.findInvocation = command => {
    expect(mockFn).toHaveBeenCalledWith(command, expect.anything());
    return mockFn.mock.calls.find(call => call[0] === command)[1];
  };

  return mockFn;
}

/**
 * Creates a jest mock function whose implementation invokes `.on`/`.once` listeners after a setTimeout tick.
 * Closely mirrors `createMockSendCommandFn`.
 *
 * It is decorated with two methods:
 *    - `mockEvent` which pushes protocol event payload for consumption
 *    - `findListener` which asserts that `on` was invoked with the given event name and
 *      returns the listener .
 */
function createMockOnceFn() {
  const mockEvents = [];
  const mockFn = jest.fn().mockImplementation((eventName, listener) => {
    const indexOfResponse = mockEvents.findIndex(entry => entry.event === eventName);
    if (indexOfResponse === -1) return;
    const {response} = mockEvents[indexOfResponse];
    mockEvents.splice(indexOfResponse, 1);
    // Wait a tick because real events never fire immediately
    setTimeout(() => listener(response), 0);
  });

  mockFn.mockEvent = (event, response) => {
    mockEvents.push({event, response});
    return mockFn;
  };

  mockFn.findListener = event => {
    expect(mockFn).toHaveBeenCalledWith(event, expect.anything());
    return mockFn.mock.calls.find(call => call[0] === event)[1];
  };

  return mockFn;
}

/**
 * Very much like `createMockOnceFn`, but will fire all the events (not just one for every call).
 * So it's good for .on w/ many events.
 */
function createMockOnFn() {
  const mockEvents = [];
  const mockFn = jest.fn().mockImplementation((eventName, listener) => {
    const events = mockEvents.filter(entry => entry.event === eventName);
    if (!events.length) return;
    for (const event of events) {
      const indexOfEvent = mockEvents.indexOf(event);
      mockEvents.splice(indexOfEvent, 1);
    }
    // Wait a tick because real events never fire immediately
    setTimeout(() => {
      for (const event of events) {
        listener(event.response);
      }
    }, 0);
  });

  mockFn.mockEvent = (event, response) => {
    mockEvents.push({event, response});
    return mockFn;
  };

  mockFn.findListener = event => {
    expect(mockFn).toHaveBeenCalledWith(event, expect.anything());
    return mockFn.mock.calls.find(call => call[0] === event)[1];
  };

  return mockFn;
}

module.exports = {
  createMockSendCommandFn,
  createMockOnceFn,
  createMockOnFn,
};

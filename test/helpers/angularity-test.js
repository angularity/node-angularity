/* globals it */
'use strict';

var Q = require('q');

/**
 * Test runner base for angularity cli tests
 * @type {{create: {function}}}
 */
var runner = require('./cli-test')
  .create()
  .forProgram('angularity')
  .withDirectories('test/expected', 'test/temp')
  .withSourceFilter(/!app-*/)
  .seal();

/**
 * Create an <code>Array.forEach()</code> handler for enumerating test-runner cases
 * @param {function} body A method containing expectations
 * @returns {function} An code>Array.forEach()</code> handler that itself returns a promise
 */
function forEachIt(body) {
  return function (testRunner) {
    var deferred = Q.defer();
    it(testRunner, function (done) {
      testRunner
        .run()
        .then(body)
        .finally(done)
        .finally(deferred.resolve.bind(deferred));
    });
    return deferred.promise;
  };
}

module.exports = {
  runner   : runner,
  forEachIt: forEachIt
};
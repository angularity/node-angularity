/* globals it */
'use strict';

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
 * @returns {function} An code>Array.forEach()</code> handler
 */
function forEachIt(body) {
  return function (testRunner) {
    it(testRunner, function (done) {
      testRunner
        .run()
        .then(body)
        .finally(done);
    });
  };
}

module.exports = {
  runner   : runner,
  forEachIt: forEachIt
};
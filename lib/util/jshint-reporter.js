'use strict';

var path       = require('path');

var gulpJshint = require('gulp-jshint');

//TODO @bguiz get this from config
var defaultReporterName = 'angularity-jshint-reporter';

/**
 * Cache resolved reporter object or stream
 * @type {function}
 */
var resolvedReporter;

/**
 * Dynamically load a JsHint reporter
 *
 * This reporter may either be a streaming reporter (an asynchronous gulp stream),
 * or a default jshint reporter (a synchronous function).
 *
 * This function requires the reporter, and caches it for later use,
 * as there should only be one instance per invocation.
 *
 * @param {string} reporterName The name of the reporter, which can be either:
 *   - A package name, or
 *   - The absolute path to a node package
 * @return {function} The `required`ed jshint report, ready to be piped a gulp stream
 */
function getJsHintReporter(reporterName) {
  // establish a cached copy
  if (!resolvedReporter) {
    if (typeof reporterName !== 'string') {
      throw 'Reporter name is unspecified';
    }
    else {
      var reporterPath;

      // first check angularity installed modules, then check project locally installed modules
      [(path.resolve('node_modules')), undefined].forEach(function (baseDir) {
        reporterPath = (!!baseDir) ? path.join(baseDir, reporterName) : reporterName;
        try {
          var indirect = require(reporterPath);
          if (Object.prototype.toString.call(indirect) === '[object Object]') {
            // In newer JsHint convention, the `index.js` file exports the object with the reporter functions directly
            // e.g. `modules.exports = { reporter: function( /* ... */ ) { /* ... */ } };`
            resolvedReporter = indirect;
          }
          else if (typeof indirect === 'string') {
            // In legacy JsHint convention, the `index.js` file exports a string which jshint itself should require
            // e.g. `module.exports = require('path').join(__dirname, 'reporter.js');`
            resolvedReporter = require(indirect);
          }
        }
        catch (ex) {
          // Do nothing: Handled outside loop when resolvedReporter not set
        }
      });
      if (!resolvedReporter) {
        throw 'Attempt to require specified reporter with no success.';
      }
    }
  }

  // return cached copy
  if (!!resolvedReporter && (typeof resolvedReporter.streamReporter === 'function')) {
    // Streaming reporters can get instantiated directly
    return resolvedReporter.streamReporter();
  }
  else if (!!resolvedReporter && (typeof resolvedReporter.reporter === 'function')) {
    // Standard JsHint reporters need to be wrapped by gulp-jshint
    return gulpJshint.reporter(resolvedReporter);
  }
  else {
    throw 'Given reporter is badly formed';
  }
}

module.exports = {
  get                : getJsHintReporter,
  defaultReporterName: defaultReporterName
};

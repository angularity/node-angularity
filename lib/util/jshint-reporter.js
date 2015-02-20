'use strict';

var path = require('path');

var gulpJshint = require('gulp-jshint');

var yargs = require('./yargs');

var defaultReporterName = 'angularity-jshint-reporter';

/**
 * Cached copy of the reporter
 * @type {function}
 */
var jsHintReporter;

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
  if (typeof reporterName !== 'string') {
    throw 'Get JsHint Reporter: Reporter name is unspecified';
  }

  // establish a cached copy
  if (!jsHintReporter) {
    if (reporterName === defaultReporterName) {
      jsHintReporter = require(defaultReporterName);
    } else {
      var reporterPath = (path.dirname(reporterName) === '.') ?
        path.resolve('node_modules', reporterName) :
        reporterName;
      try {
        jsHintReporter = require(reporterPath);
        if (typeof jsHintReporter === 'string') {
          //In JsHint convention, the `index.js` file exports a string which jshint itself should require
          //e.g. `module.exports = require('path').join(__dirname, 'reporter.js');`
          jsHintReporter = gulpJshint.reporter(require(jsHintReporter));
        }
      } catch (ex) {
        throw 'Get JsHint Reporter: Attempt to require reporter from path ' + reporterPath + ' with no success.';
      }
    }
  }

  // return cached copy
  return jsHintReporter;
}

var yargsOptionDefiniton = {
  key: 'reporter',
  value: {
    describe: 'Specify a custom JsHint reporter to use. Either a locally npm installed module, or the absolute path ' +
      'to one.',
    alias: ['r'],
    default: defaultReporterName,
    string: true
  }
};
var checkJsHintReporter = yargs.createCheck()
  .withGate(function (argv) {
    return !argv.help;
  })
  .withTest({
    reporter: function(value) {
      if (typeof value === 'undefined') {
        return;
      }
      try {
        getJsHintReporter(value);
      }
      catch (ex) {
        return 'Illegal value for "reporter"\n' + ex;
      }
    }
  })
  .commit();

module.exports = {
  get                : getJsHintReporter,
  yargsCheck         : checkJsHintReporter,
  yargsOption        : yargsOptionDefiniton,
  defaultReporterName: defaultReporterName
};

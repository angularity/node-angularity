'use strict';

var path = require('path');

var gulpJshint = require('gulp-jshint');

var yargs = require('./yargs');

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
      throw 'Get JsHint Reporter: Reporter name is unspecified';
    }
    else {
      // first check angularity installed modules, then check project locally installed modules
      [ path.resolve('node_modules'), null ].forEach(function (base) {
          var reporterPath = base ? path.join(base, reporterName) : reporterName;
          try {
            // In JsHint convention, the `index.js` file exports a string which jshint itself should require
            // e.g. `module.exports = require('path').join(__dirname, 'reporter.js');`
            // this is the indirect case.
            // However in some cases it may be the reporter itself
            var indirect = require(reporterPath);
            resolvedReporter = (typeof indirect === 'string') ? require(indirect) : indirect;
          } catch (ex) {
            /* do nothing */
          }
        });
      if (!resolvedReporter) {
        throw 'Get JsHint Reporter: Attempt to require reporter from path ' + reporterPath + ' with no success.';
      }
    }
  }

  // return cached copy
  //  closure that returns a stream
  if (typeof resolvedReporter === 'function') {
    return resolvedReporter();
  }
  //  jshint plugin object with reporter field
  else if (!!(resolvedReporter) && (typeof resolvedReporter.reporter === 'function')) {
    return gulpJshint.reporter(resolvedReporter);
  }
  //  unsupported
  else {
    throw 'Get JsHint Reporter: Given reporter is badly formed';
  }
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

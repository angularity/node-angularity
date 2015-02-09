'use strict';

var path = require('path');

var gulpJshint = require('gulp-jshint');

/**
 * Dynamically load a JsHint reporter
 */
var jsHintReporter;
function getJsHintReporter(reporterName, defaultReporterName) {
  if (jsHintReporter) {
    return jsHintReporter;
  }

  if (reporterName === defaultReporterName) {
    jsHintReporter = require(defaultReporterName);
  }
  else {
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
    }
    catch (ex) {
      throw 'Attempt to require reporter from path '+reporterPath+' with no success.';
    }
  }

  return jsHintReporter;
}

module.exports.get = getJsHintReporter;

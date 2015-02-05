'use strict';

var gulp        = require('gulp'),
    path        = require('path'),
    reduce      = require('lodash.reduce'),
    slash       = require('gulp-slash'),
    bowerDir    = require('bower-directory');

var config     = require('./config'),
    bowerFiles = require('../inject/bower-files');

var CONSOLE_WIDTH = config.getConsoleWidth();

var NODE           = 'node_modules',
    BOWER          = path.relative(process.cwd(), bowerDir.sync()),
    APP            = 'app',
    BUILD          = 'app-build',
    TEST           = 'app-test',
    RELEASE_BUNDLE = 'app-release',
    RELEASE_VENDOR = 'app-release/vendor',
    ROUTES         = reduce([ '', BOWER, BUILD ], mapRoutes, { });

/**
 * Create a glob with the given pattern elements, and additional directory
 * @param {Array|string} pattern One or more glob pattern entries to be included as-in
 * @param {Array|string} [additional] Any number of non-library directories to include
 * @return {Array} A multi-element glob pattern
 */
function getGlob(pattern, additional) {
  var patternArray    = (typeof pattern    === 'string') ? [ pattern  ]   : pattern    || [];
  var additionalArray = (typeof additional === 'string') ? [ additional ] : additional || [];
  return patternArray.concat([NODE, BOWER, APP, BUILD, TEST, RELEASE_BUNDLE, RELEASE_VENDOR]
    .filter(function convertAdditionalToExclude(element) {
      return (additionalArray.indexOf(element) < 0);
    })
    .map(function excludeDir(exclude) {
      return '!' + exclude + '/**';
    }));
}

function mapRoutes(result, path) {
  result['/' + slash(path)] = path; // result['/<path>'] = <path>
  return result;
}

function jsApp(opts) {
  return gulp.src([APP + '/**/*.js', '!**/assets/**'], opts);
}

function jsLib(opts) {
  return gulp.src(getGlob(['**/*.js', '!*.js']), opts);
}

function jsSpec(opts) {
  return gulp.src(getGlob(['**/*.spec.js', '!*.spec.js'], APP), opts);
}

function htmlApp(opts) {
  return gulp.src([APP + '/**/*.html', '!**/assets/**'], opts);
}

function imageApp(opts, mainGlob) {
  var mainGlob = mainGlob || ['**/*.png'];
  return gulp.src(getGlob(mainGlob, [NODE, BOWER], opts));
}

function scssApp(opts) {
  return gulp.src([APP + '/**/*.scss', '!**/assets/**'], opts);
}

function imageHtmlApp(opts) {
  return gulp.src(getGlob(['**/*.html'], [NODE, BOWER], opts));
}

function testDependencies(opts) {
  return bowerFiles(CONSOLE_WIDTH)
    .src('js', opts);
};

module.exports = {
  NODE            : NODE,
  BOWER           : BOWER,
  APP             : APP,
  BUILD           : BUILD,
  TEST            : TEST,
  RELEASE_BUNDLE  : RELEASE_BUNDLE,
  RELEASE_VENDOR  : RELEASE_VENDOR,
  ROUTES          : ROUTES,
  jsApp           : jsApp,
  scssApp         : scssApp,
  htmlApp         : htmlApp,
  imageHtmlApp    : imageHtmlApp,
  imageApp        : imageApp,
  jsLib           : jsLib,
  jsSpec          : jsSpec,
  testDependencies: testDependencies,
  getGlob         : getGlob
};

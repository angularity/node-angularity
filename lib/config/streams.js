'use strict';

var gulp     = require('gulp'),
    path     = require('path'),
    flatten  = require('lodash.flatten'),
    reduce   = require('lodash.reduce'),
    slash    = require('gulp-slash'),
    bowerDir = require('bower-directory');

var bowerFiles = require('../inject/bower-files');

var NODE           = 'node_modules',
    BOWER          = path.relative(process.cwd(), bowerDir.sync()),
    APP            = 'app',
    GENERATED      = 'app-*',
    BUILD          = 'app-build',
    TEST           = 'app-test',
    RELEASE_BUNDLE = 'app-release',
    RELEASE_VENDOR = 'app-release/vendor',
    ROUTES         = reduce([ '', BOWER, BUILD ], mapRoutes, { });

/**
 * Create a glob generator that only includes files from the local library, unless additional paths are given.
 * Additional paths must be of the form <code>NODE</code>, <code>BOWER</code>, <code>APP</code>, or
 * <code>GENERATED</code>.
 * @param {...string} [additional] Any number of non-library directories to include
 * @return {function({Array})} A multi-element glob pattern
 */
function getLocalLibGlob() {
  var additional = flatten(Array.prototype.slice.call(arguments));
  var excludes   = [NODE, BOWER, APP, GENERATED]
    .filter(function convertAdditionalToExclude(element) {
      return (additional.indexOf(element) < 0);
    })
    .map(function excludeDirectory(exclude) {
      return '!' + exclude + '/**';
    });
  return function() {
    return flatten(Array.prototype.slice.call(arguments))
      .concat(excludes); // important - excludes must come after includes
  };
}

function mapRoutes(result, path) {
  result['/' + slash(path)] = path; // result['/<path>'] = <path>
  return result;
}

function jsApp(opts) {
  return gulp.src([APP + '/**/*.js', '!**/assets/**'], opts);
}

function jsLib(opts) {
  return gulp.src(getLocalLibGlob()('**/*.js', '!*.js', '!**/*.spec.js'), opts);
}

function jsSpec(opts) {
  return gulp.src(getLocalLibGlob()('**/*.spec.js', '!*.spec.js'), opts);
}

function scssApp(opts) {
  return gulp.src([APP + '/**/*.scss', '!**/assets/**'], opts);
}

function htmlApp(opts) {
  return gulp.src([APP + '/**/*.html', '!**/assets/**'], opts);
}

function testDependencies(opts) {
  return bowerFiles(80)
    .src('js', opts);
}

module.exports = {
  NODE            : NODE,
  BOWER           : BOWER,
  APP             : APP,
  GENERATED       : GENERATED,
  BUILD           : BUILD,
  TEST            : TEST,
  RELEASE_BUNDLE  : RELEASE_BUNDLE,
  RELEASE_VENDOR  : RELEASE_VENDOR,
  ROUTES          : ROUTES,
  jsApp           : jsApp,
  scssApp         : scssApp,
  htmlApp         : htmlApp,
  jsLib           : jsLib,
  jsSpec          : jsSpec,
  testDependencies: testDependencies,
  getLocalLibGlob : getLocalLibGlob
};

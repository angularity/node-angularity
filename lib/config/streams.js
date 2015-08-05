'use strict';

var gulp      = require('gulp'),
    path      = require('path'),
    slash     = require('gulp-slash'),
    bowerDir  = require('bower-directory');

var bowerFiles = require('../inject/bower-files'),
    libGlobber = require('./lib-globber');

var NODE           = 'node_modules',
    BOWER          = path.relative(process.cwd(), bowerDir.sync()),
    APP            = 'app',
    GENERATED      = 'app-*',
    BUILD          = 'app-build',
    TEST           = 'app-test',
    RELEASE_BUNDLE = 'app-release',
    RELEASE_VENDOR = 'app-release/vendor',
    ROUTES         = ['', BOWER, BUILD].reduce(mapRoutes, {});

var getLocalLibGlob = libGlobber(NODE, BOWER, APP, GENERATED);

function mapRoutes(result, path) {
  result['/' + slash(path)] = path; // result['/<path>'] = <path>
  return result;
}

function jsApp(opts) {
  return gulp.src([APP + '/**/*.js', '!**/assets/**'], opts);
}

function jsLib(opts) {
  return gulp.src(getLocalLibGlob()('**/*.js', '!**/*.spec.js'), opts);
}

function jsSpec(opts) {
  return gulp.src(getLocalLibGlob()('**/*.spec.js'), opts);
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

'use strict';

var gulp       = require('gulp'),
    semiflat   = require('gulp-semiflat'),
    combined   = require('combined-stream'),
    slash      = require('gulp-slash');

var config     = require('./config'),
    bowerFiles = require('../inject/bower-files');

var CONSOLE_WIDTH = config.getConsoleWidth();

var BOWER        = 'bower_components',
    JS_LIB_BOWER = 'bower_components/**/js-lib',
    JS_LIB_LOCAL = 'src/js-lib',
    JS_SRC       = 'src/target',
    JS_BUILD     = 'build',

    CSS_LIB_BOWER = 'bower_components/**/css-lib',
    CSS_LIB_LOCAL = 'src/css-lib',
    CSS_SRC       = 'src/target',
    CSS_BUILD     = 'build',

    HTML_SRC      = 'src/target',
    HTML_BUILD    = 'build',
    PARTIALS_NAME = 'templates',

    RELEASE       = 'release',
    CDN_LIB = 'html-lib',
    //var project       = require(path.resolve('package.json')),
    CDN_APP = 'test.version', //todo fix name
    //CDN_APP       = (project.category ? (project.category + '/') : '') + project.name,
    RELEASE_LIB   = RELEASE + '/vendor',
    RELEASE_APP   = RELEASE;

function jsLibStream(opts) {
  return combined.create()
    .append(gulp.src(JS_LIB_BOWER + '/**/*.js', opts)                     // bower lib JS
      .pipe(semiflat(JS_LIB_BOWER)))
    .append(gulp.src([JS_LIB_LOCAL + '/**/*.js', '!**/*.spec.js'], opts)  // local lib JS overwrites
      .pipe(semiflat(JS_LIB_LOCAL)));
};

function jsSrcStream(opts) {
  return gulp.src([JS_SRC + '/**/*.js', '!**/assets/**'], opts)           // local app JS
    .pipe(semiflat(JS_SRC));
};

function jsSpecStream(opts) {
  return gulp.src(JS_LIB_LOCAL + '/**/*.spec.js', opts)                   // local lib SPEC JS
    .pipe(semiflat(JS_LIB_LOCAL));
};

function scssLibStream(opts) {
  return combined.create()
    .append(gulp.src(CSS_LIB_BOWER + '/**/*.scss', opts)                  // bower lib SCSS
      .pipe(semiflat(CSS_LIB_BOWER)))
    .append(gulp.src(CSS_LIB_LOCAL + '/**/*.scss', opts)                  // local lib SCSS overwrites
      .pipe(semiflat(CSS_LIB_LOCAL)))
    .append(gulp.src(BOWER + '/**/*.scss', opts));                        // bower vendor SCSS
};

function scssSrcStream(opts) {
  return gulp.src([CSS_SRC + '/**/*.scss', '!**/assets/**'], opts)        // local app CSS
    .pipe(semiflat(CSS_SRC));
};

function testDependencyStream(opts) {
  return bowerFiles(CONSOLE_WIDTH)
    .src('js', opts);
};

function htmlPartialsSrcStream(opts) {
  return gulp.src([HTML_SRC + '/**/partials/**/*.html', '!**/assets/**'], opts)
    .pipe(semiflat(HTML_SRC));
};

function htmlAppSrcStream(opts) {
  return gulp.src([HTML_SRC + '/**/*.html', '!**/assets/**', '!**/partials/**'], opts)
    .pipe(semiflat(HTML_SRC));
};

function routes() {
  var result = {};
  [ BOWER,
    JS_SRC,
    JS_BUILD,
    JS_LIB_LOCAL,
    CSS_SRC,
    CSS_BUILD,
    CSS_LIB_LOCAL
  ].forEach(function (path) {
      result['/' + slash(path)] = path; // result['/<path>'] = <path>
    });
  return result;
};

module.exports = {
  BOWER                : BOWER,
  PARTIALS_NAME        : PARTIALS_NAME,
  JS_LIB_BOWER         : JS_LIB_BOWER,
  JS_LIB_LOCAL         : JS_LIB_LOCAL,
  JS_SRC               : JS_SRC,
  JS_BUILD             : JS_BUILD,
  CSS_LIB_BOWER        : JS_LIB_BOWER,
  CSS_LIB_LOCAL        : JS_LIB_LOCAL,
  CSS_SRC              : CSS_SRC,
  CSS_BUILD            : CSS_BUILD,
  HTML_SRC             : HTML_SRC,
  HTML_BUILD           : HTML_BUILD,
  RELEASE              : RELEASE,
  RELEASE_LIB          : RELEASE_LIB,
  RELEASE_APP          : RELEASE_APP,

  jsLibStream          : jsLibStream,
  jsSrcStream          : jsSrcStream,
  jsSpecStream         : jsSpecStream,
  scssLibStream        : scssLibStream,
  scssSrcStream        : scssSrcStream,
  testDependencyStream : testDependencyStream,
  htmlPartialsSrcStream: htmlPartialsSrcStream,
  htmlAppSrcStream     : htmlAppSrcStream,
  routes               : routes
};
'use strict';

var gulp       = require('gulp'),
    semiflat   = require('gulp-semiflat'),
    combined   = require('combined-stream'),
    slash      = require('gulp-slash'),
    requireDir = require('require-dir');

// Initiate the angularity configuration,
// prompt the user if a global config does not exist
require('./lib/config/config');

var browserify       = require('./lib/build/browserify'),
    bowerFiles       = require('./lib/inject/bower-files'),
    angularityConfig = require('./lib/config/config');

// TODO combine with config.js??
var angularity = {};

angularity.HTTP_PORT = angularityConfig.getServerHttpPort();
angularity.CONSOLE_WIDTH = angularityConfig.getConsoleWidth();

angularity.BOWER = 'bower_components';

angularity.JS_LIB_BOWER = 'bower_components/**/js-lib';
angularity.JS_LIB_LOCAL = 'src/js-lib';
angularity.JS_SRC = 'src/target';
angularity.JS_BUILD = 'build';

angularity.CSS_LIB_BOWER = 'bower_components/**/css-lib';
angularity.CSS_LIB_LOCAL = 'src/css-lib';
angularity.CSS_SRC = 'src/target';
angularity.CSS_BUILD = 'build';

angularity.HTML_SRC = 'src/target';
angularity.HTML_BUILD = 'build';
angularity.PARTIALS_NAME = 'templates';

angularity.RELEASE = 'release';
angularity.CDN_LIB = 'html-lib';
//var project       = require(path.resolve('package.json'));
angularity.CDN_APP = 'test.version'; //todo fix name
//angularity.CDN_APP       = (project.category ? (project.category + '/') : '') + project.name;
angularity.RELEASE_LIB = angularity.RELEASE + '/vendor';
angularity.RELEASE_APP = angularity.RELEASE;
angularity.JAVASCRIPT_VERSION = angularityConfig.getJavascriptVersion();

// TODO move to tasks??
angularity.jsLibStream = function (opts) {
  return combined.create()
    .append(gulp.src(angularity.JS_LIB_BOWER + '/**/*.js', opts)                      // bower lib JS
      .pipe(semiflat(angularity.JS_LIB_BOWER)))
    .append(gulp.src([angularity.JS_LIB_LOCAL + '/**/*.js', '!**/*.spec.js'], opts)   // local lib JS overwrites
      .pipe(semiflat(angularity.JS_LIB_LOCAL)));
};

angularity.jsSrcStream = function (opts) {
  return gulp.src([angularity.JS_SRC + '/**/*.js', '!**/assets/**'], opts)            // local app JS
    .pipe(semiflat(angularity.JS_SRC));
};

angularity.jsSpecStream = function (opts) {
  return gulp.src(angularity.JS_LIB_LOCAL + '/**/*.spec.js', opts)                    // local lib SPEC JS
    .pipe(semiflat(angularity.JS_LIB_LOCAL));
};

angularity.scssLibStream = function (opts) {
  return combined.create()
    .append(gulp.src(angularity.CSS_LIB_BOWER + '/**/*.scss', opts)    // bower lib SCSS
      .pipe(semiflat(angularity.CSS_LIB_BOWER)))
    .append(gulp.src(angularity.CSS_LIB_LOCAL + '/**/*.scss', opts)    // local lib SCSS overwrites
      .pipe(semiflat(angularity.CSS_LIB_LOCAL)))
    .append(gulp.src(angularity.BOWER + '/**/*.scss', opts));          // bower vendor SCSS
};

angularity.scssSrcStream = function (opts) {
  return gulp.src([angularity.CSS_SRC + '/**/*.scss', '!**/assets/**'], opts)  // local app CSS
    .pipe(semiflat(angularity.CSS_SRC));
};

angularity.testDependencyStream = function (opts) {
  return bowerFiles(angularity.CONSOLE_WIDTH)
    .prepend(browserify.RUNTIME)
    .src('js', opts);
};

angularity.htmlPartialsSrcStream = function (opts) {
  return gulp.src([angularity.HTML_SRC + '/**/partials/**/*.html', '!**/assets/**'], opts)
    .pipe(semiflat(angularity.HTML_SRC));
};

angularity.htmlAppSrcStream = function (opts) {
  return gulp.src([angularity.HTML_SRC + '/**/*.html', '!**/assets/**', '!**/partials/**'], opts)
    .pipe(semiflat(angularity.HTML_SRC));
};

angularity.routes = function () {
  var result = {};
  [ angularity.BOWER,
    angularity.JS_SRC,
    angularity.JS_BUILD,
    angularity.JS_LIB_LOCAL,
    angularity.CSS_SRC,
    angularity.CSS_BUILD,
    angularity.CSS_LIB_LOCAL
  ].forEach(function (path) {
      result['/' + slash(path)] = path;
    });
  return result;
};

angularity.hr = function (char, length, title) {
  var text = (title) ? (' ' + title.split('').join(' ').toUpperCase() + ' ') : '';  // double spaced title text
  while (text.length < length) {
    text = char + text + char;  // centre title between the given character
  }
  return text.slice(0, length); // enforce length, left justified
};

module.exports = angularity;

requireDir('./tasks');
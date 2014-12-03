'use strict';

//todo combine with config.js
var gulp     = require('gulp'),
    semiflat = require('gulp-semiflat'),
    combined = require('combined-stream'),
    slash    = require('gulp-slash');

var browserify       = require('./lib/build/browserify'),
    bowerFiles       = require('./lib/inject/bower-files'),
    angularityConfig = require('./lib/config/config');

var angularity = {};

angularity.HTTP_PORT = angularityConfig.serverHttpPort();
angularity.CONSOLE_WIDTH = angularityConfig.consoleWidth();

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
angularity.RELEASE_LIB = angularity.RELEASE + '/' + angularity.CDN_LIB + '/$';
angularity.RELEASE_APP = angularity.RELEASE + '/' + angularity.CDN_APP + '/$';
angularity.JAVASCRIPT_VERSION = angularityConfig.javascriptVersion();

//todo move to tasks
angularity.jsLibStream = function (opts) {
  return combined.create()
    .append(gulp.src(angularity.JS_LIB_BOWER + '/**/*.js', opts)                       // bower lib JS
      .pipe(semiflat(angularity.JS_LIB_BOWER)))
    .append(gulp.src([angularity.JS_LIB_LOCAL + '/**/*.js', '`!**/*.spec.js'], opts)  // local lib JS overwrites
      .pipe(semiflat(angularity.JS_LIB_LOCAL)));
};

angularity.jsSrcStream = function (opts) {
  return gulp.src([angularity.JS_SRC + '/**/*.js', '!**/assets/**'], opts)           // local app JS
    .pipe(semiflat(angularity.JS_SRC));
};

angularity.jsSpecStream = function (opts) {
  return gulp.src(angularity.JS_LIB_LOCAL + '/**/*.spec.js', opts)                     // local lib SPEC JS
    .pipe(semiflat(angularity.JS_LIB_LOCAL));
};

angularity.scssLibStream = function (opts) {
  return combined.create()
    .append(gulp.src(angularity.CSS_LIB_BOWER + '/**/*.scss', opts)            // bower lib CSS
      .pipe(semiflat(angularity.CSS_LIB_BOWER)))
    .append(gulp.src(angularity.CSS_LIB_LOCAL + '/**/*.scss', opts)            // local lib CSS overwrites
      .pipe(semiflat(angularity.CSS_LIB_LOCAL)))
    .append(gulp.src(angularity.BOWER + '/**/bootstrap/bootstrap.scss', opts)  // bower bootstrap SASS
      .pipe(semiflat(angularity.BOWER + '/**/bootstrap')));
};

angularity.scssSrcStream = function (opts) {
  return gulp.src([angularity.CSS_SRC + '/**/*.scss', '!**/assets/**'], opts)  // local app CSS
    .pipe(semiflat(angularity.CSS_SRC));
};

angularity.testDependencyStream = function (opts) {
  return bowerFiles(angularity.CONSOLE_WIDTH)
    .prepend(browserify.RUNTIME)
    .js(opts);
};

angularity.bowerStream = function (opts) {
  return bowerFiles(angularity.CONSOLE_WIDTH)
    .all(opts);
};

angularity.htmlPartialsSrcStream = function (opts) {
  return gulp.src([angularity.HTML_SRC + '/**/partials/**/*.html', '!**/assets/**'], opts)
    .pipe(semiflat(angularity.HTML_SRC));
};

angularity.htmlAppSrcStream = function (opts) {
  return gulp.src([angularity.HTML_SRC + '/**/*.html',
    '!**/assets/**', '!**/partials/**'], opts) // ignore partials and assets
    .pipe(semiflat(angularity.HTML_SRC));
};

angularity.routes = function () {
  var result = {};
  [angularity.BOWER,
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
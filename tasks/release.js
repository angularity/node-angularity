'use strict';

var gulp        = require('gulp'),
    concat      = require('gulp-concat'),
    wrap        = require('gulp-wrap'),
    inject      = require('gulp-inject'),
    plumber     = require('gulp-plumber'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence'),
    combined    = require('combined-stream');

var config           = require('../lib/config/config'),
    injectAdjacent   = require('../lib/inject/adjacent-files'),
    injectTransform  = require('../lib/inject/relative-transform'),
    bowerFiles       = require('../lib/inject/bower-files'),
    versionDirectory = require('../lib/release/version-directory'),
    hr               = require('../lib/util/hr'),
    streams          = require('../lib/config/streams');

var CONSOLE_WIDTH = config.getConsoleWidth();

gulp.task('release', ['build'], function (done) {
  console.log(hr('-', CONSOLE_WIDTH, 'release'));
  runSequence(
    'release:clean',
    'release:adjacent',
    'release:inject',
    done
  );
});

// clean the html build directory
gulp.task('release:clean', function () {
  return gulp.src(streams.RELEASE, {read: false})
    .pipe(rimraf());
});

gulp.task('release:adjacent', function () {
  return combined.create()
    .append(gulp.src([streams.JS_BUILD + '/**/*.js', '!**/dev/**', '!**/test**']))
    .append(gulp.src([streams.CSS_BUILD + '/**/*.css', '!**/dev/**', '!**/test**']))
    .append(gulp.src([streams.HTML_SRC + '/**/*.html', '!**/dev/**', '!**/partials/**']))
    .append(gulp.src([streams.HTML_SRC + '/**/assets/**']))
    .pipe(gulp.dest(streams.RELEASE_APP));
});

// inject dependencies into html and output to build directory
gulp.task('release:inject', function() {
  var bower = bowerFiles()
    .src('*', { base: true, manifest: true })
    .pipe(gulp.dest(streams.RELEASE_LIB));
  return gulp.src([ streams.RELEASE_APP + '/**/*.html', '!**/dev/**' ])
    .pipe(plumber())
    .pipe(injectAdjacent('js|css', streams.RELEASE_APP, {
      name: 'inject',
      transform: injectTransform
    }))
    .pipe(inject(bower, {
      name: 'bower',
      transform: injectTransform
    }))
    .pipe(gulp.dest(streams.RELEASE_APP));
});

// version the release app directory
/* TODO resolve versioning and CDN release
gulp.task('release:versionapp', function () {
  return gulp.src(streams.RELEASE_APP + '/**')
    .pipe(versionDirectory('$', true));
});
*/

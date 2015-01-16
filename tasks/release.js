'use strict';

var gulp        = require('gulp'),
    concat      = require('gulp-concat'),
    wrap        = require('gulp-wrap'),
    inject      = require('gulp-inject'),
    plumber     = require('gulp-plumber'),
    rimraf      = require('gulp-rimraf'),
    semiflat    = require('gulp-semiflat'),
    runSequence = require('run-sequence');

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
  return gulp.src([streams.RELEASE_BUNDLE, streams.RELEASE_VENDOR], {read: false})
    .pipe(rimraf());
});

gulp.task('release:adjacent', function () {
  return gulp.src([streams.BUILD + '/*.js*', streams.BUILD + '/*.css*', streams.BUILD + '/assets/**'])
    .pipe(semiflat(streams.BUILD))
    .pipe(gulp.dest(streams.RELEASE_BUNDLE));
});

// inject dependencies into html and output to build directory
gulp.task('release:inject', function() {
  function bower() {
    return bowerFiles()
      .src('*', { base: true, manifest: true })
      .pipe(gulp.dest(streams.RELEASE_VENDOR));
  }
  return gulp.src([streams.APP + '/*.html'])
    .pipe(plumber())
    .pipe(gulp.dest(streams.RELEASE_BUNDLE))  // put html in final directory first to get correct inject paths
    .pipe(injectAdjacent('js|css', {
      name     : 'inject',
      transform: injectTransform
    }))
    .pipe(inject(bower(), {
      name     : 'bower',
      transform: injectTransform
    }))
    .pipe(gulp.dest(streams.RELEASE_BUNDLE));
});

// version the release app directory
/* TODO resolve versioning and CDN release
gulp.task('release:versionapp', function () {
  return gulp.src(streams.RELEASE_APP + '/**')
    .pipe(versionDirectory('$', true));
});
*/

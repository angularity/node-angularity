'use strict';

var gulp        = require('gulp'),
    concat      = require('gulp-concat'),
    inject      = require('gulp-inject'),
    plumber     = require('gulp-plumber'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence');

var config         = require('../lib/config/config'),
    injectAdjacent = require('../lib/inject/adjacent-files'),
    bowerFiles     = require('../lib/inject/bower-files'),
    hr             = require('../lib/util/hr'),
    streams        = require('../lib/config/streams');

var CONSOLE_WIDTH = config.getConsoleWidth();

gulp.task('html', function (done) {
  console.log(hr('-', CONSOLE_WIDTH, 'html'));
  runSequence(
    'html:clean',
    ['html:inject', 'html:assets'],
    done
  );
});

// clean the html build directory
gulp.task('html:clean', function () {
  return gulp.src([streams.BUILD + '/**/*.html*', streams.BUILD + '/**/assets/**'], {read: false})
    .pipe(rimraf());
});

// inject dependencies into html and output to build directory
gulp.task('html:inject', function () {
  return streams.htmlApp()
    .pipe(plumber())
    .pipe(gulp.dest(streams.BUILD)) // put html in final directory first to get correct inject paths
    .pipe(injectAdjacent('js|css', {
      name: 'inject'
    }))
    .pipe(inject(bowerFiles().src('js|css', {read: false}), {
      name: 'bower'
    }))
    .pipe(gulp.dest(streams.BUILD));
});

// copy assets to build directory
gulp.task('html:assets', function () {
  return gulp.src(streams.APP + '/**/assets/**')
    .pipe(gulp.dest(streams.BUILD));
});

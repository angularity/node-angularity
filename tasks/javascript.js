'use strict';

var gulp        = require('gulp'),
    jshint      = require('gulp-jshint'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence'),
    combined    = require('combined-stream'),
    to5ify      = require('6to5ify'),
    ngAnnotate  = require('browserify-ngannotate');

var karma          = require('../lib/test/karma'),
    jsHintReporter = require('../lib/build/jshint-reporter'),
    browserify     = require('../lib/build/browserify'),
    config         = require('../lib/config/config'),
    angularity     = require('../index');

gulp.task('js', function (done) {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'javascript'));
  runSequence(
    ['js:clean', 'js:init'],
    ['js:build'],
    done
  );
});

gulp.task('test', function (done) {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'test'));
  runSequence(
    'js:init',
    'js:unit',
    done
  );
});

// clean the js build directory
gulp.task('js:clean', function () {
  return gulp.src(angularity.JS_BUILD + '/**/*.js*', {read: false})
    .pipe(rimraf());
});

var bundler;

// mark sources for browserify and run linter
gulp.task('js:init', function () {
  bundler = browserify(angularity.CONSOLE_WIDTH);
  return combined.create()
    .append(angularity.jsLibStream())
    .append(angularity.jsSrcStream())
    .append(angularity.jsSpecStream())
    .pipe(bundler.sources())
    .pipe(jshint())
    .pipe(jsHintReporter(angularity.CONSOLE_WIDTH));
});

// karma unit tests in local library only
gulp.task('js:unit', function () {
  return angularity.jsSpecStream()
    .pipe(bundler.compile(to5ify, bundler.jasmineTransform).all('karma-main.js'))
    .pipe(gulp.dest(angularity.JS_BUILD))
    .pipe(karma({
      files     : angularity.testDependencyStream({dev: true}).list,
      frameworks: ['jasmine'],
      reporters : ['spec'],
      browsers  : ['Chrome'],
      logLevel  : 'error'
    }, angularity.CONSOLE_WIDTH));
});

// give a single optimised js file in the build directory with source map for each
gulp.task('js:build', function () {
  return angularity.jsSrcStream({read: false})
    .pipe(bundler.compile(to5ify, ngAnnotate).each(config.isMinify))
    .pipe(gulp.dest(angularity.JS_BUILD));
});
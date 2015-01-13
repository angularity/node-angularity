'use strict';

var gulp        = require('gulp'),
    jshint      = require('gulp-jshint'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence'),
    combined    = require('combined-stream'),
    to5ify      = require('6to5ify'),
    stringify   = require('stringify'),
    ngAnnotate  = require('browserify-ngannotate');

var config         = require('../lib/config/config'),
    karma          = require('../lib/test/karma'),
    jsHintReporter = require('../lib/build/jshint-reporter'),
    browserify     = require('../lib/build/browserify'),
    hr             = require('../lib/util/hr'),
    streams        = require('../lib/config/streams');

var CONSOLE_WIDTH = config.getConsoleWidth();

gulp.task('js', function (done) {
  console.log(hr('-', CONSOLE_WIDTH, 'javascript'));
  runSequence(
    ['js:clean', 'js:init'],
    ['js:build'],
    done
  );
});

gulp.task('test', function (done) {
  console.log(hr('-', CONSOLE_WIDTH, 'test'));
  runSequence(
    'js:init',
    'js:unit',
    done
  );
});

// clean the js build directory
gulp.task('js:clean', function () {
  return gulp.src(streams.JS_BUILD + '/**/*.js*', {read: false})
    .pipe(rimraf());
});

var bundler;

// mark sources for browserify and run linter
gulp.task('js:init', function () {
  bundler = browserify(CONSOLE_WIDTH);
  return combined.create()
    .append(streams.jsLibStream())
    .append(streams.jsSrcStream())
    .append(streams.jsSpecStream())
    .pipe(bundler.sources())
    .pipe(jshint())
    .pipe(jsHintReporter(CONSOLE_WIDTH));
});

// karma unit tests in local library only
gulp.task('js:unit', function () {
  return streams.jsSpecStream()
    .pipe(bundler.compile(stringify(['.html']), to5ify, ngAnnotate, bundler.jasmineTransform).all('karma-main.js'))
    .pipe(gulp.dest(streams.JS_BUILD))
    .pipe(karma({
      files     : streams.testDependencyStream({dev: true}).list,
      frameworks: ['jasmine'],
      reporters : ['spec'],
      browsers  : ['Chrome'],
      logLevel  : 'error'
    }, CONSOLE_WIDTH));
});

// give a single optimised js file in the build directory with source map for each
gulp.task('js:build', function () {
  return streams.jsSrcStream({read: false})
    .pipe(bundler.compile(stringify(['.html']), to5ify, ngAnnotate).each(config.isMinify))
    .pipe(gulp.dest(streams.JS_BUILD));
});
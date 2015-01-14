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

var TRANSFORMS = [
  to5ify.configure({ ignoreRegex: /(?!)/ }),    // convert any es6 to es5 (ignoreRegex is degenerate)
  stringify(['.htm', '.html']),                 // allow import of html
  ngAnnotate                                    // @ngInject for angular injection points
];

gulp.task('js', function (done) {
  console.log(hr('-', CONSOLE_WIDTH, 'javascript'));
  runSequence(
    ['js:cleanbuild', 'js:lint'],
    ['js:build'],
    done
  );
});

gulp.task('test', function (done) {
  console.log(hr('-', CONSOLE_WIDTH, 'test'));
  runSequence(
    ['js:cleanunit', 'js:lint'],
    'js:unit',
    done
  );
});

// clean js from the build directory
gulp.task('js:cleanbuild', function () {
  return gulp.src(streams.BUILD + '/**/*.js*', {read: false})
    .pipe(rimraf());
});

// clean js from the test directory
gulp.task('js:cleanunit', function () {
  return gulp.src(streams.TEST + '/**/*.js*', {read: false})
    .pipe(rimraf());
});

// run linter
gulp.task('js:lint', function () {
  return combined.create()
    .append(streams.jsApp())
    .append(streams.jsLib())
    .append(streams.jsSpec())
    .pipe(jshint())
    .pipe(jsHintReporter(CONSOLE_WIDTH));
});

// karma unit tests in local library only
gulp.task('js:unit', function () {
  return streams.jsSpec()
    .pipe(browserify
      .compile(CONSOLE_WIDTH, TRANSFORMS.concat(browserify.jasmineTransform('@')))
      .all('karma-main.js'))
    .pipe(gulp.dest(streams.TEST))
    .pipe(karma({
      files     : streams.testDependencies({dev: true}).list,
      frameworks: ['jasmine'],
      reporters : ['spec'],
      browsers  : ['Chrome'],
      logLevel  : 'error'
    }, CONSOLE_WIDTH));
});

// give a single optimised js file in the build directory with source map for each
gulp.task('js:build', function () {
  return streams.jsApp({read: false})
    .pipe(browserify
      .compile(CONSOLE_WIDTH, TRANSFORMS)
      .each(config.isMinify))
    .pipe(gulp.dest(streams.BUILD));
});
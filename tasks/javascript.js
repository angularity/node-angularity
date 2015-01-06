'use strict';

var gulp        = require('gulp'),
    jshint      = require('gulp-jshint'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence'),
    combined    = require('combined-stream');

var karma          = require('../lib/test/karma'),
    jsHintReporter = require('../lib/build/jshint-reporter'),
    browserify     = require('../lib/build/browserify'),
    config         = require('../lib/config/config'),
    compileTargets = require('../lib/config/defaults').compileTargets,
    angularity     = require('../index');

gulp.task('js', function (done) {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'javascript'));

  var buildTasks = ['js:build'];

  if (angularity.JAVASCRIPT_VERSION === compileTargets.ES6) {
    buildTasks.push('js:runtime');
  }

  runSequence(
    ['js:clean', 'js:init'],
    buildTasks,
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
    .pipe(bundler.reserve())
    .pipe(jshint())
    .pipe(jsHintReporter(angularity.CONSOLE_WIDTH));
});

// karma unit tests in local library only
gulp.task('js:unit', function () {
  var preJasmine = bundler.getJasmineTransform({
    '@': function (filename) {
      return filename + ':0:0';
    }  // @ is replaced with filename:0:0
  });
  return angularity.jsSpecStream()
    .pipe(bundler.compile(preJasmine, compileTargets.ES6 && bundler.es6ifyTransform)
      .all('test/karma-main.js'))
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
    .pipe(bundler.compile(compileTargets.ES6 && bundler.es6ifyTransform)
      .each(config.isMinify))
    .pipe(gulp.dest(angularity.JS_BUILD));
});

// copy the traceur runtime to the build directory
// have previously tried to include with bower components gives too many problems
gulp.task('js:runtime', function () {
  return gulp.src(browserify.RUNTIME)
    .pipe(gulp.dest(angularity.JS_BUILD));
});
'use strict';

var gulp = require('gulp');
var concat = require('gulp-concat');
var wrap = require('gulp-wrap');
var inject = require('gulp-inject');
var jshint = require('gulp-jshint');
var minifyHtml = require('gulp-minify-html');
var ngHtml2js = require('gulp-ng-html2js');
var plumber = require('gulp-plumber');
var rimraf = require('gulp-rimraf');
var watch = require('gulp-watch');
var watchSequence = require('gulp-watch-sequence');
var runSequence = require('run-sequence');
var bourbon = require('node-bourbon');

var combined = require('combined-stream');

var karma = require('../lib/test/karma');
var jsHintReporter = require('../lib/build/jshint-reporter');
var browserify = require('../lib/build/browserify');
var nodeSass = require('../lib/build/node-sass');

var injectAdjacent = require('../lib/inject/adjacent-files');
var injectTransform = require('../lib/inject/relative-transform');
var versionDirectory = require('../lib/release/version-directory');

var angularity = require('../index');

// DEFAULT ---------------------------------
var isMinify = (process.argv[process.argv.length - 1] !== 'nominify');

gulp.task('default', ['watch']);

gulp.task('nominify', ['watch']);

gulp.task('build', function (done) {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'build'));
  runSequence('js', 'css', 'html', done);
});

// JS ---------------------------------
gulp.task('js', function (done) {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'javascript'));
  runSequence(
    ['js:clean', 'js:init'],
    ['js:build', 'js:runtime'],
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

  if (angularity.javascriptTarget === angularity.ES5) {

    return angularity.jsSpecStream()
      .pipe(bundler.compile(preJasmine).all('test/karma-main.js'))
      .pipe(gulp.dest(angularity.JS_BUILD))
      .pipe(karma({
        files     : angularity.testDependencyStream({dev: true}).list,
        frameworks: ['jasmine'],
        reporters : ['spec'],
        browsers  : ['Chrome'],
        logLevel  : 'error'
      }, angularity.CONSOLE_WIDTH));

  } else if (angularity.javascriptTarget === angularity.ES6) {

    return angularity.jsSpecStream()
      .pipe(bundler.compile(preJasmine, bundler.es6ifyTransform).all('test/karma-main.js'))
      .pipe(gulp.dest(angularity.JS_BUILD))
      .pipe(karma({
        files     : angularity.testDependencyStream({dev: true}).list,
        frameworks: ['jasmine'],
        reporters : ['spec'],
        browsers  : ['Chrome'],
        logLevel  : 'error'
      }, angularity.CONSOLE_WIDTH));
  }

});

// give a single optimised js file in the build directory with source map for each
gulp.task('js:build', function () {
  if (angularity.javascriptTarget === angularity.ES5) {

    return angularity.jsSrcStream({read: false})
      .pipe(bundler.compile().each(isMinify))
      .pipe(gulp.dest(angularity.JS_BUILD));

  } else if (angularity.javascriptTarget === angularity.ES6) {

    return angularity.jsSrcStream({read: false})
      .pipe(bundler.compile(bundler.es6ifyTransform).each(isMinify))
      .pipe(gulp.dest(angularity.JS_BUILD));
  }
});

// copy the traceur runtime to the build directory
//  have previously tried to include with bower components gives too many problems
gulp.task('js:runtime', function () {
  return gulp.src(browserify.RUNTIME)
    .pipe(gulp.dest(angularity.JS_BUILD));
});

// CSS ---------------------------------
gulp.task('css', function (done) {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'css'));
  runSequence(
    ['css:clean', 'css:init'],
    'css:build',
    done
  );
});

// clean the css build directory
gulp.task('css:clean', function () {
  return gulp.src(angularity.CSS_BUILD + '/**/*.css*', {read: false})
    .pipe(rimraf());
});



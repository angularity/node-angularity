'use strict';

var gulp        = require('gulp'),
    jshint      = require('gulp-jshint'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence'),
    combined    = require('combined-stream'),
    to5ify      = require('6to5ify'),
    stringify   = require('stringify'),
    wordwrap    = require('wordwrap'),
    ngAnnotate  = require('browserify-ngannotate');

var config         = require('../lib/config/config'),
    karma          = require('../lib/test/karma'),
    jsHintReporter = require('../lib/build/jshint-reporter'),
    browserify     = require('../lib/build/browserify'),
    yargs          = require('../lib/util/yargs'),
    hr             = require('../lib/util/hr'),
    streams        = require('../lib/config/streams');

var cliArgs = yargs.resolveInstance;

yargs.getInstance('js')
  .usage(wordwrap(2, 80)('The "js" task performs a one time build of the javascript composition root(s).'))
  .example('$0 js', 'Run this task')
  .example('$0 js -u', 'Run this task but do not minify javascript')
  .describe('h', 'This help message').alias('h', '?').alias('h', 'help')
  .describe('u', 'Inhibit minification of javascript').alias('u', 'unminified').boolean('u').default('u', false)
  .strict()
  .check(yargs.subCommandCheck)
  .wrap(80);

var TRANSFORMS = [
  to5ify.configure({ ignoreRegex: /(?!)/ }),  // convert any es6 to es5 (ignoreRegex is degenerate)
  stringify({ minify: true }),                // allow import of html to a string
  !cliArgs().unminified && ngAnnotate           // @ngInject for angular injection points
];
// TODO @bholloway fix sourcemaps in ngAnnotate so that it may be included even when not minifying

gulp.task('js', function (done) {
  console.log(hr('-', 80, 'javascript'));
  runSequence(
    ['js:cleanbuild', 'js:lint'],
    ['js:build'],
    done
  );
});

gulp.task('test', function (done) {
  console.log(hr('-', 80, 'test'));
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
    .pipe(jsHintReporter(80));
});

// karma unit tests in local library only
gulp.task('js:unit', function () {
  return streams.jsSpec()
    .pipe(browserify
      .compile(80, TRANSFORMS.concat(browserify.jasmineTransform('@')))
      .all('karma-main.js'))
    .pipe(gulp.dest(streams.TEST))
    .pipe(karma({
      files     : streams.testDependencies({dev: true}).list,
      frameworks: ['jasmine'],
      reporters : ['spec'],
      browsers  : ['Chrome'],
      logLevel  : 'error'
    }, 80));
});

// give a single optimised js file in the build directory with source map for each
gulp.task('js:build', function () {
  return streams.jsApp({read: false})
    .pipe(browserify
      .compile(80, TRANSFORMS)
      .each(!cliArgs().unminified))
    .pipe(gulp.dest(streams.BUILD));
});
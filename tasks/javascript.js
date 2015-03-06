'use strict';

var path = require('path'),
    fs   = require('fs');

var gulp        = require('gulp'),
    jshint      = require('gulp-jshint'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence'),
    combined    = require('combined-stream'),
    semiflat    = require('gulp-semiflat'),
    to5ify      = require('6to5ify'),
    stringify   = require('stringify'),
    wordwrap    = require('wordwrap'),
    ngAnnotate  = require('browserify-ngannotate');

var karma           = require('../lib/test/karma'),
    browserify      = require('../lib/build/browserify'),
    yargs           = require('../lib/util/yargs'),
    hr              = require('../lib/util/hr'),
    streams         = require('../lib/config/streams'),
    jshintReporter  = require('../lib/util/jshint-reporter');

var cliArgs;

yargs.getInstance('javascript')
  .usage(wordwrap(2, 80)('The "javascript" task performs a one time build of the javascript composition root(s) ' +
    'and also bundles of all .spec.js files in the project.'))
  .example('angularity javascript', 'Run this task')
  .example('angularity javascript -u', 'Run this task but do not minify javascript')
  .options('help', {
    describe: 'This help message',
    alias: ['h', '?'],
    boolean: true
  })
  .options('unminified', {
    describe: 'Inhibit minification of javascript',
    alias: ['u'],
    boolean: true,
    default: false
  })
  .options(jshintReporter.yargsOption.key, jshintReporter.yargsOption.value)
  .strict()
  .check(yargs.subCommandCheck)
  .check(jshintReporter.yargsCheck)
  .wrap(80);

//TODO @bguiz jsHintReporter module should only need to be imported by this module
//however, at the moment, the other gulp tasks use different yargs instances
//and therefore the options and checks need to repeated in each one,
//making the code tightly couple when they should not be.
//Proper solution would be to have yargs.getInstance modified to
//mixin options and checks from dependent/ prequisite yargs instances

gulp.task('javascript', function (done) {
  console.log(hr('-', 80, 'javascript'));
  cliArgs = cliArgs || yargs.resolveArgv();
  runSequence(
    ['javascript:cleanbuild', 'javascript:cleanunit', 'javascript:lint'],
    ['javascript:build', 'javascript:unit'],
    done
  );
});

// clean javascript from the build directory
gulp.task('javascript:cleanbuild', function () {
  return gulp.src(streams.BUILD + '/**/*.js*', {read: false})
    .pipe(rimraf());
});

// clean javascript from the test directory
//  don't remove the karma conf or Webstorm ide will have problems
gulp.task('javascript:cleanunit', function () {
  return gulp.src([streams.TEST + '/**/*.js*', '!**/karma.conf.js'], {read: false}) // keep configuration
    .pipe(rimraf());
});

// run linter
gulp.task('javascript:lint', function () {
  return combined.create()
    .append(streams.jsApp())
    .append(streams.jsLib())
    .append(streams.jsSpec())
    .pipe(jshint())
    .pipe(jshintReporter.get(cliArgs[jshintReporter.yargsOption.key]));
});

// karma unit tests in local library only
gulp.task('javascript:unit', function () {
  var reporters = [].concat(cliArgs[karma.yargsOption.key])
    .filter(Boolean);
  return combined.create()
    .append(
      streams
        .testDependencies({
          dev : true,
          read: false
        })
    )
    .append(
      streams
        .jsSpec()
        .pipe(browserify
          .compile(80, getTransforms().concat(browserify.jasmineTransform('@')))
          .all('index.js', false, '/base'))
        .pipe(gulp.dest(streams.TEST))
    )
    .pipe(semiflat(process.cwd()))
    .pipe(karma.createConfig(reporters))
    .pipe(gulp.dest(streams.TEST))
});

// give a single optimised javascript file in the build directory with source map for each
gulp.task('javascript:build', function () {
  return streams.jsApp({read: false})
    .pipe(browserify
      .compile(80, getTransforms(!cliArgs.unminified))
      .each(!cliArgs.unminified))
    .pipe(gulp.dest(streams.BUILD));
});

/**
 * Retrieve the transform list
 * @param {boolean} isMinify Indicates whether minification will be used
 */
function getTransforms(isMinify) {
  return [
    to5ify.configure({ ignoreRegex: /(?!)/ }),   // convert any es6 to es5 (degenerate regex)
    stringify({ minify: false }),                // allow import of html to a string
    isMinify && ngAnnotate, { sourcemap: true }  // @ngInject for angular injection points
  ].filter(Boolean);
  // TODO @bholloway fix stringify({ minify: true }) throwing error on badly formed html so that we can minify
  // TODO @bholloway fix sourcemaps in ngAnnotate so that it may be included even when not minifying
}
'use strict';

var gulp        = require('gulp'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence'),
    wordwrap    = require('wordwrap'),
    path        = require('path');

var config   = require('../lib/config/config'),
    nodeSass = require('../lib/build/node-sass'),
    yargs    = require('../lib/util/yargs'),
    hr       = require('../lib/util/hr'),
    streams  = require('../lib/config/streams');

var cliArgs = yargs.resolveInstance;

yargs.getInstance('css')
  .usage(wordwrap(2, 80)('The "css" task performs a one time build of the SASS composition root(s).'))
  .example('$0 css', 'Run this task')
  .describe('h', 'This help message').alias('h', '?').alias('h', 'help')
  .strict()
  .check(yargs.subCommandCheck)
  .wrap(80);

gulp.task('css', function (done) {
  console.log(hr('-', 80, 'css'));
  runSequence(
    'css:clean',
    'css:build',
    done
  );
});

// clean the css build directory
gulp.task('css:clean', function () {
  return gulp.src(streams.BUILD + '/**/*.css*', {read: false})
    .pipe(rimraf());
});

// compile sass with the previously discovered lib paths
gulp.task('css:build', function () {
  return streams.scssApp()
    .pipe(nodeSass(80, [streams.BOWER, streams.NODE]))
    .pipe(gulp.dest(streams.BUILD));
});
'use strict';

var gulp        = require('gulp'),
    wordwrap    = require('wordwrap'),
    runSequence = require('run-sequence');

var config = require('../lib/config/config'),
    yargs  = require('../lib/util/yargs'),
    hr     = require('../lib/util/hr');

var cliArgs = yargs.resolveInstance;

yargs.getInstance('build')
  .usage(wordwrap(2, 80)('The "build" task performs a single build of the javascript and SASS composition root(s).'))
  .example('$0 build', 'Run this task')
  .example('$0 build -n', 'Run this task but do not minify javascript')
  .describe('h', 'This help message').alias('h', '?').alias('h', 'help')
  .describe('u', 'Inhibit minification of javascript').alias('u', 'unminified').boolean('u').default('u', false)
  .strict()
  .check(yargs.subCommandCheck)
  .wrap(80);

gulp.task('build', function (done) {
  console.log(hr('-', 80, 'build'));
  runSequence('js', 'css', 'html', done);
});
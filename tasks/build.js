'use strict';

var gulp        = require('gulp'),
    wordwrap    = require('wordwrap'),
    runSequence = require('run-sequence');

var yargs            = require('../lib/util/yargs'),
    jshintReporter   = require('../lib/util/jshint-reporter'),
    hr               = require('../lib/util/hr');

yargs.getInstance('build')
  .usage(wordwrap(2, 80)('The "build" task performs a single build of the javascript and SASS composition root(s).'))
  .example('angularity build', 'Run this task')
  .example('angularity build -u', 'Run this task but do not minify javascript')
  .options('help', {
    describe: 'This help message',
    alias   : [ 'h', '?' ],
    boolean : true
  })
  .options('unminified', {
    describe: 'Inhibit minification of javascript',
    alias   : 'u',
    boolean : true,
    default : false
  })
  .options(jshintReporter.yargsOption.key, jshintReporter.yargsOption.value)
  .strict()
  .check(yargs.subCommandCheck)
  .check(jshintReporter.yargsCheck)
  .wrap(80);

gulp.task('build', function (done) {
  console.log(hr('-', 80, 'build'));
  runSequence('javascript', 'css', 'html', done);
});

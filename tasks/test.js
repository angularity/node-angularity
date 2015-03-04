'use strict';

var path = require('path'),
    fs   = require('fs');

var gulp      = require('gulp'),
    jshint    = require('gulp-jshint'),
    stringify = require('stringify'),
    wordwrap  = require('wordwrap');

var karma          = require('../lib/test/karma'),
    yargs          = require('../lib/util/yargs'),
    hr             = require('../lib/util/hr'),
    streams        = require('../lib/config/streams'),
    jshintReporter = require('../lib/util/jshint-reporter');

yargs.getInstance('test')
  .usage(wordwrap(2, 80)('The "test" task performs a one time build and karma test of all .spec.js files in the ' +
    'project.'))
  .example('angularity test', 'Run this task')
  .options('help', {
    describe: 'This help message',
    alias   : [ 'h', '?' ],
    boolean : true
  })
  .options(karma.yargsOption.key, karma.yargsOption.value)
  .options(jshintReporter.yargsOption.key, jshintReporter.yargsOption.value)
  .strict()
  .check(yargs.subCommandCheck)
  .check(karma.yargsCheck)
  .check(jshintReporter.yargsCheck)
  .wrap(80);

gulp.task('test', ['javascript'], function () {
  console.log(hr('-', 80, 'test'));
  gulp.src(streams.TEST + '/karma.conf.js')
    .pipe(karma.run());
});
'use strict';

var gulp        = require('gulp'),
    wordwrap    = require('wordwrap'),
    runSequence = require('run-sequence');

var yargs  = require('../lib/util/yargs'),
    hr     = require('../lib/util/hr');

yargs.getInstance('build')
  .usage(wordwrap(2, 80)('The "build" task performs a single build of the javascript and SASS composition root(s).'))
  .example('$0 build', 'Run this task')
  .example('$0 build -n', 'Run this task but do not minify javascript')
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
  .strict()
  .check(yargs.subCommandCheck)
  .wrap(80);

gulp.task('build', function (done) {
  console.log(hr('-', 80, 'build'));
  runSequence('javascript', 'css', 'html', done);
});
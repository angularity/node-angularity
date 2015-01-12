'use strict';

var gulp        = require('gulp'),
    runSequence = require('run-sequence');

var config      = require('../lib/config/config'),
    hr          = require('../lib/util/hr');

var CONSOLE_WIDTH = config.getConsoleWidth();

gulp.task('default', ['watch']);

gulp.task('nominify', ['watch']);

gulp.task('build', function (done) {
  console.log(hr('-', CONSOLE_WIDTH, 'build'));
  runSequence('js', 'css', 'html', done);
});
'use strict';

var gulp        = require('gulp'),
    runSequence = require('run-sequence'),
    hr          = require('../lib/util/hr'),
    config      = require('../lib/config/config');

var CONSOLE_WIDTH = config.getConsoleWidth();

gulp.task('default', ['watch']);

gulp.task('nominify', ['watch']);

gulp.task('build', function (done) {
  console.log(hr('-', CONSOLE_WIDTH, 'build'));
  runSequence('js', 'css', 'html', done);
});
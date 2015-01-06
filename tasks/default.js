'use strict';

var gulp        = require('gulp'),
    runSequence = require('run-sequence'),
    angularity  = require('../index');

gulp.task('default', ['watch']);

gulp.task('nominify', ['watch']);

gulp.task('build', function (done) {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'build'));
  runSequence('js', 'css', 'html', done);
});
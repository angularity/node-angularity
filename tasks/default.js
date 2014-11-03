'use strict';

var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    runSequence = require('run-sequence'),
    chalk       = require('chalk'),
    prettyTime  = require('pretty-hrtime'),
    angularity  = require('../index');

gulp.task('default', ['watch']);

gulp.task('nominify', ['watch']);

gulp.task('build', function (done) {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'build'));
  runSequence('js', 'css', 'html', done);
});

gulp.on('task_start', function (e) {
  gutil.log('Starting', '\'' + chalk.cyan(e.task) + '\'...');
});

gulp.on('task_stop', function (e) {
  var time = prettyTime(e.hrDuration);
  gutil.log(
    'Finished', '\'' + chalk.cyan(e.task) + '\'',
    'after', chalk.magenta(time)
  );
});
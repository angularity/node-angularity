#!/usr/local/bin/node

'use strict';

var gulp       = require('gulp');
var gutil      = require('gulp-util');
var prettyTime = require('gulp/node_modules/pretty-hrtime');
var chalk      = require('gulp/node_modules/chalk');

require('../index');

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

var taskName = process.argv[2];
gulp.start(gulp.hasTask(taskName) ? taskName : 'default');

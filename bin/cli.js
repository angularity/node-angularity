#!/usr/bin/env node
'use strict';

/**
 * The main command line interface for running Angularity
 * from the npm global install.
 *
 * If no arguments are specified it will load an interactive cli menu.
 */
var gulp   = require('gulp'),
gutil      = require('gulp-util'),
prettyTime = require('pretty-hrtime'),
chalk      = require('chalk'),
requireDir = require('require-dir');

require('../lib/config').init();

require('../index');
requireDir('../tasks');

var generator = require('../lib/generator/generator');
generator.requireProjects();

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

if (typeof taskName === 'undefined')
  require('../lib/cli/mainMenu').defaultPrompt();
else
  gulp.start(gulp.hasTask(taskName) ? taskName : 'default');
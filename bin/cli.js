#!/usr/bin/env node

/**
 * The main command line interface for running Angularity
 * from the npm global install.
 *
 * If no arguments are specified it will load an interactive cli menu.
 */
var gulp = require('gulp');
var gutil = require('gulp-util');
var prettyTime = require('pretty-hrtime');
var chalk = require('chalk');

require('../index');

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
    require('../lib/generator/cliMenu').defaultPrompt();
else
    gulp.start(gulp.hasTask(taskName) ? taskName : 'default');
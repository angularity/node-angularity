#!/usr/bin/env node
/**
 * The main command line interface for running Angularity
 * from the npm global install.
 *
 * If no arguments are specified it will load an interactive cli menu.
 */
'use strict';

var path       = require('path'),
    gulp       = require('gulp'),
    gutil      = require('gulp-util'),
    chalk      = require('chalk'),
    prettyTime = require('pretty-hrtime');

var mainMenu = require('../lib/cli/mainMenu');
require('../index');

var generator = require('../lib/generator/generator');
generator.requireProjects();

// we need to duplicate some event handlers from the gulp cli since we have bypassed it
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

// gulp tasks can access argv using this same method
var argv = require('./cli-args').argv;

var taskName = (!!argv._) ? argv._[0] : undefined;

if (argv.version) {
  var packagePath = path.join(__dirname, '..', 'package.json');
  var version     = require(packagePath).version;
  console.log('angularity:', version);
}
else if (!taskName) {
  mainMenu.prompt();
}
else {
  gulp.start(gulp.hasTask(taskName) ? taskName : 'default');
}

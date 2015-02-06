#!/usr/bin/env node
/**
 * The main command line interface for running Angularity
 * from the npm global install.
 */
'use strict';

var path        = require('path'),
    gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    wordwrap    = require('wordwrap'),
    runSequence = require('run-sequence'),
    chalk       = require('chalk'),
    prettyTime  = require('pretty-hrtime');

var yargs = require('./../lib/util/yargs');

// TODO @bholloway menus
//var mainMenu = require('../lib/cli/mainMenu');
require('../index');

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

// describe the top level arguments
yargs.getInstance()
  .usage(wordwrap(2, 80)([
    'Angularity is an opinionated build tool for AngularJS projects.',
    '',
    'Tasks include:',
    yargs.listTasks().join(', ')
  ].join('\n')))
  .example('angularity', 'Interactive menu')
  .example('angularity -v', 'Display the version of angularity')
  .example('angularity -h \<task name\>', 'Get help on a particular task')
  .example('angularity \<task name\>', 'Run the given task')
  .describe('h', 'This help message, or help on a specific task').alias('h', '?').alias('h', 'help')
  .describe('version', 'Display the version of angularity').alias('version', 'v').boolean('version')
  .wrap(80);

// find the yargs instance that is most appropriate for the given command line parameters
var cliArgs = yargs.resolveArgv();

// show help
if (cliArgs.help) {
  yargs
    .getInstance(cliArgs.taskName || cliArgs.help)
    .showHelp();
}
// run a task
else if (cliArgs.taskName) {
  runSequence(cliArgs.taskName);
}
// show the version string
else if (cliArgs.version) {
  var packagePath = path.join(__dirname, '..', 'package.json');
  var version     = require(packagePath).version;
  console.log('angularity:', version);
}
// interactive menu
else {
  mainMenu.prompt();
}
#!/usr/bin/env node
/**
 * The main command line interface for running Angularity
 * from the npm global install.
 */
'use strict';

var path        = require('path'),
    gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    runSequence = require('run-sequence'),
    chalk       = require('chalk'),
    prettyTime  = require('pretty-hrtime');

var yargs = require('./../lib/util/yargs');

var mainMenu = require('../lib/cli/mainMenu');
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
  .usage('Angularity is an opinionated build tool for AngularJS projects.\n\nTasks include:\n  ' +
    yargs.listTasks().join(', '))
  .example('$0', 'Interactive menu')
  .example('$0 -v', 'Display the version of angularity')
  .example('$0 -h <task name>', 'Get help on a particular task')
  .example('$0 <task name>', 'Run the given task')
  .describe('h', 'This help message, or help on a specific task').alias('h', '?').alias('h', 'help')
  .describe('version', 'Display the version of angularity').alias('version', 'v').boolean('version')
  .strict()
  .check(yargs.subCommandCheck)
  .wrap(80);

// find the yargs instance that is most appropriate for the given command line parameters
var argv = yargs.resolveInstance();

// show help
if (argv.help) {
  yargs
    .getInstance(argv.taskName || argv.help)
    .showHelp();
}
// run a task
else if (argv.taskName) {
  runSequence(argv.taskName);
}
// show the version string
else if (argv.version) {
  var packagePath = path.join(__dirname, '..', 'package.json');
  var version     = require(packagePath).version;
  console.log('angularity:', version);
}
// interactive menu
else {
  mainMenu.prompt();
}
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
    prettyTime  = require('pretty-hrtime'),
    yargs       = require('yargs');

var taskYargs = require('../lib/util/task-yargs');

// TODO @bholloway menus
// var mainMenu = require('../lib/cli/mainMenu');
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

var packageJson = require(path.join(__dirname, '..', 'package.json'));
var defaultYargsInstance = yargs
  .usage(wordwrap(2, 80)([
    packageJson.description,
    '',
    'Tasks include:'
    //TODO add task list here
  ].join('\n')))
  // .example('angularity', 'Interactive menu') //TODO reinstate when interactive menu ins reinstated
  .example('angularity -v', 'Display the version of angularity')
  .example('angularity -h \<task name\>', 'Get help on a particular task')
  .example('angularity \<task name\>', 'Run the given task')
  .option('help', {
    describe: 'This help message, or help on a specific task',
    alias: ['h', '?'],
    boolean: true
  })
  .option('version', {
    describe: 'Display the version of angularity',
    alias: ['v'],
    boolean: true
  });

var taskName = taskYargs.getCurrentName();
if (taskName) {
  runSequence(taskName);
}
else {
  var cliArgs = defaultYargsInstance.argv;
  if (cliArgs.help) {
    defaultYargsInstance.showHelp();
  }
  else if (cliArgs.version) {
    console.log('angularity:', packageJson.version);
  }
}

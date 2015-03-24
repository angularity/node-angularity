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
    chalk       = require('chalk'),
    prettyTime  = require('pretty-hrtime'),
    yargs       = require('yargs');

var taskYargsRun  = require('../lib/util/task-yargs-run');

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
var helpOption = {
  key: 'help',
  value: {
    describe: 'This help message, or help on a specific task',
    alias: ['h', '?'],
    boolean: true
  }
};

var defaultYargsInstance = yargs
  .usage(wordwrap(2, 80)([
    packageJson.description,
    '',
    'Tasks include:'
    //TODO add task list here
  ].join('\n')))
  // .example('angularity', 'Interactive menu') //TODO reinstate when interactive menu is reinstated
  .example('angularity -v', 'Display the version of angularity')
  .example('angularity \<task name\> -h', 'Get help on a particular task')
  .example('angularity \<task name\>', 'Run the given task')
  .option('version', {
    describe: 'Display the curent version',
    alias: ['v'],
    boolean: true
  })
  .option(helpOption.key, helpOption.value);

var cliArgs;
cliArgs = defaultYargsInstance.argv;
var hasCommands = (cliArgs._.length > 0);
if (hasCommands) {
  require('../index');
  var taskName = taskYargsRun.taskYargs.getCurrentName();
  if (taskName) {
    taskYargsRun.current();
  }
  else {
    console.log('Task specified is not recognised');
    defaultYargsInstance.showHelp();
  }
}
else {
  if (cliArgs.version) {
    console.log('angularity:', packageJson.version);
  }
  else {
    if (!cliArgs.help) {
      console.log('No task specified');
    }
    defaultYargsInstance.showHelp();
  }
}

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

taskYargs.register('__default', {
  description: (path.join(__dirname, '..', 'package.json').description || 'Angularity'),
  prerequisiteTasks: [],
  checks: [],
  options: [
    {
      key: 'help',
      value: {
        describe: 'This help message, or help on a specific task',
        alias: ['h', '?'],
        boolean: true
      }
    },
    {
      key: 'version',
      value: {
        describe: 'Display the version of angularity',
        alias: ['v'],
        boolean: true
      }
    }
  ]
});

var taskName = taskYargs.getCurrentName();
var yargsInstance = taskYargs.getCurrent() || taskYargs.get('__default', process.argv.slice(2));
//TODO deal with slice automatically, and allow no arguments for non-subtask tasks
var cliArgs = (yargsInstance) ? yargsInstance.argv : {};
if (cliArgs.help) {
  yargsInstance
    .usage(wordwrap(2, 80)([
      'Angularity is an opinionated build tool for AngularJS projects.',
      '',
      'Tasks include:'
      //TODO add task list here
    ].join('\n')))
    // .example('angularity', 'Interactive menu') //TODO reinstate when interactive menu ins reinstated
    .example('angularity -v', 'Display the version of angularity')
    .example('angularity -h \<task name\>', 'Get help on a particular task')
    .example('angularity \<task name\>', 'Run the given task');
  yargsInstance.showHelp();
}
else if (cliArgs.version) {
  var packagePath = path.join(__dirname, '..', 'package.json');
  var version     = require(packagePath).version;
  console.log('angularity:', version);
}
else if (taskName) {
  runSequence(taskName);
}

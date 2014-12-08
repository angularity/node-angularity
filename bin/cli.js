#!/usr/bin/env node
/**
 * The main command line interface for running Angularity
 * from the npm global install.
 *
 * If no arguments are specified it will load an interactive cli menu.
 */
'use strict';

var path = require('path'),
    gulp = require('gulp');

require('../index');

var taskName = process.argv[2];

if (typeof taskName === 'undefined') {
  require('../lib/cli/mainMenu').defaultPrompt();

} else if (taskName == '-v') {
  var packagePath = path.join(__dirname, '..', 'package.json');
  var version = require(packagePath).version;
  console.log('angularity:', version);

} else {
  gulp.start(gulp.hasTask(taskName) ? taskName : 'default');
}
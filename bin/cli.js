#!/usr/bin/env node
'use strict';

/**
 * The main command line interface for running Angularity
 * from the npm global install.
 *
 * If no arguments are specified it will load an interactive cli menu.
 */
var gulp   = require('gulp'),
requireDir = require('require-dir');

// Initiate the angularity configuration,
// prompt the user if a global config does not exist
require('../lib/config').init();

require('../index');
requireDir('../tasks');

var taskName = process.argv[2];

if (typeof taskName === 'undefined')
  require('../lib/cli/mainMenu').defaultPrompt();
else
  gulp.start(gulp.hasTask(taskName) ? taskName : 'default');
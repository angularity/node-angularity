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

var generator = require('../lib/generator/generator');
generator.requireProjects();

var taskName = process.argv[2];

// With no arguments, prompt the main menu.
if (typeof taskName === 'undefined') {
  require('../lib/cli/mainMenu').defaultPrompt();

// Allow a version command with `angularity -v`
} else if (taskName === '-v' || taskName === 'v') {
  var packagePath = path.join(__dirname, '..', 'package.json');
  var version = require(packagePath).version;
  console.log('angularity:', version);

// Use the project generator with `angularity generate <name>`
} else if (taskName === 'generate') {
  generator.util.generateProject(process.argv[3]);

// Allow the default gulp tasks to be run on the global cli
} else {
  gulp.start(gulp.hasTask(taskName) ? taskName : 'default');
}
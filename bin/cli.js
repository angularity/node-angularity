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

var mainMenu = require('../lib/cli/mainMenu');

require('../index');

var generator = require('../lib/generator/generator');
generator.requireProjects();

// expect the second argument to be the task name
var taskName = process.argv[2];
switch(taskName) {

  // with no arguments, prompt the main menu.
  case undefined:
    mainMenu.defaultPrompt();
    break;

  // allow a version command with `angularity -v`
  case 'v':
  case '-v':
    var packagePath = path.join(__dirname, '..', 'package.json');
    var version     = require(packagePath).version;
    console.log('angularity:', version);
    break;

  // use the project generator with `angularity generate <name>`
  case 'generate':
    generator.util.generateProject(process.argv[3]);
    break;

  // allow the default gulp tasks to be run on the global cli
  default:
    gulp.start(gulp.hasTask(taskName) ? taskName : 'default');
}
/**
 * The main prompts for Angularity's command line interface.
 */
'use strict';

var inquirer = require('inquirer'),
    gulp     = require('gulp'),
    gulpUtil = require('gulp-util'),
    fs       = require('fs');

var generatorUtil  = require('../generator/generator').util,
    config         = require('../config/config'),
    initialiseMenu = require('./initialiseMenu'),
    generatorMenu  = require('./generatorMenu'),
    installMenu    = require('./installMenu');

require('shelljs/global');

function defaultPrompt() {
  var GULP_TASKS  = ['build', 'test', 'watch', 'release'];
  var hasExisting = generatorUtil.validateExistingProject(process.cwd());

  // banner
  var version = require('../../package.json').version;
  var art     = '\n' +
    ' █████╗ ███╗   ██╗ ██████╗ ██╗   ██╗██╗      █████╗ ██████╗ ██╗████████╗██╗   ██╗\n' +
    '██╔══██╗████╗  ██║██╔════╝ ██║   ██║██║     ██╔══██╗██╔══██╗██║╚══██╔══╝╚██╗ ██╔╝\n' +
    '███████║██╔██╗ ██║██║  ███╗██║   ██║██║     ███████║██████╔╝██║   ██║    ╚████╔╝\n' +
    '██╔══██║██║╚██╗██║██║   ██║██║   ██║██║     ██╔══██║██╔══██╗██║   ██║     ╚██╔╝\n' +
    '██║  ██║██║ ╚████║╚██████╔╝╚██████╔╝███████╗██║  ██║██║  ██║██║   ██║      ██║\n' +
    '╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝      ╚═╝\n' +
    'Version ' + version + ', visit angularity.github.io for documentation and resources\n';
  console.log(art);

  // menu
  var choices = (hasExisting ? [new inquirer.Separator('Build Options')].concat(GULP_TASKS) : [ ])
    .concat([
      new inquirer.Separator(),
      'Generate Project',
      new inquirer.Separator(),
      'Install WebStorm Tools'
    ]);
  var message = (hasExisting ? [
      'Angularity Project',
      '   ' + config.projectConfig.name,
      ' v.' + config.projectConfig.version,
      ''
    ] : [
      'Welcome to Angularity',
      gulpUtil.colors.red('  No project was found in your current working directory.'),
      ''
    ]).join('\n');
  var menuPrompt = {
    type   : 'list',
    name   : 'taskName',
    message: message,
    choices: choices,
    filter : function (value) {
      return value.toLowerCase();
    }
  };
  function handleMenu(answer) {
    var taskName = answer.taskName;
    var isValid  = (GULP_TASKS.indexOf(taskName) >= 0);
    if (isValid) {
      gulp.start(taskName);
    } else {
      switch (taskName) {
        case 'generate project':
          generatorMenu.prompt();
          break;
        case 'install webstorm tools':
          installMenu.prompt();
          break;
        case 'initialise angularity':
          initialiseMenu.prompt();
          break;
        default:
          throw new Error('unrecognised task: ' + taskName)
      }
    }
  }
  inquirer.prompt(menuPrompt, handleMenu);
}

function projectPrompt() {
  return [
    new inquirer.Separator(),
    new inquirer.Separator('Projects'),
    new inquirer.Separator(),
    generatorUtil.listProjects()
  ];
}

module.exports = {
  defaultPrompt: defaultPrompt,
  projectPrompt: projectPrompt
};
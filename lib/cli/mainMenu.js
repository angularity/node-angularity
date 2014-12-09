/**
 * The main prompts for Angularity's command line interface.
 */
'use strict';

var inquirer = require('inquirer'),
    gulp     = require('gulp'),
    gulpUtil = require('gulp-util'),
    fs       = require('fs'),
    _        = require('lodash');

var generatorUtil  = require('../generator/generator').util,
    generator      = require('../generator/generator'),
    config         = require('../config/config'),
    initialiseMenu = require('./initialiseMenu'),
    generatorMenu  = require('./generatorMenu'),
    installMenu    = require('./installMenu');

require('shelljs/global');

var menu = {};

var buildCommands = ['build', 'test', 'watch', 'release'];

menu.defaultPrompt = function () {

  var version = require('../../package.json').version;

  var art = '\n' +
    ' █████╗ ███╗   ██╗ ██████╗ ██╗   ██╗██╗      █████╗ ██████╗ ██╗████████╗██╗   ██╗\n' +
    '██╔══██╗████╗  ██║██╔════╝ ██║   ██║██║     ██╔══██╗██╔══██╗██║╚══██╔══╝╚██╗ ██╔╝\n' +
    '███████║██╔██╗ ██║██║  ███╗██║   ██║██║     ███████║██████╔╝██║   ██║    ╚████╔╝\n' +
    '██╔══██║██║╚██╗██║██║   ██║██║   ██║██║     ██╔══██║██╔══██╗██║   ██║     ╚██╔╝\n' +
    '██║  ██║██║ ╚████║╚██████╔╝╚██████╔╝███████╗██║  ██║██║  ██║██║   ██║      ██║\n' +
    '╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝      ╚═╝\n' +
    'Version ' + version + ', visit angularity.github.io for documentation and resources\n';

  console.log(art);

  inquirer.prompt(menu.mainMenuPrompt(), handleMainMenu);
};

/**
 * Construct the cli main menu.
 *
 * If there is an angularity.json file present, it is assumed that the current working directory
 * is an angularity project. The build options will only show in this case, otherwise an init
 * item will enable a angularity.json file to be generated.
 *
 * @returns {{type: string, name: string, message: string, choices: Array, filter: Function}}
 */
menu.mainMenuPrompt = function () {
  var menuItems = [];
  var message = '';

  if (generatorUtil.validateExistingProject(process.cwd())) {
    menuItems = menu.addProjectBuildOptionPrompts();
    message = ['Angularity Project \n   ', config.projectConfig.name,
      ' v.', config.projectConfig.version, '\n'].join('');

  } else {
    message = 'Welcome to Angularity';
    message += gulpUtil.colors.red('\n  No project was found in your current working directory.\n');
    menuItems.push(new inquirer.Separator());
    //menuItems.push('Initialise Angularity');
  }

  menuItems.push('Generate Project');
  menuItems.push(new inquirer.Separator());
  menuItems.push('Install WebStorm Tools');
  //menuItems.push('Help', new inquirer.Separator());

  return {
    type   : 'list',
    name   : 'taskName',
    message: message,
    choices: menuItems,
    filter : function (value) {
      return value.toLowerCase();
    }
  };
};

function handleMainMenu(answer) {
  var taskName = answer.taskName;
  var valid = _.contains(buildCommands, taskName);

  if (taskName === 'generate project') {
    generatorMenu.prompt();

  } else if (valid) {
    gulp.start(taskName);

  } else if (taskName === 'install webstorm tools') {
    installMenu.prompt();

  } else if (taskName === 'initialise angularity') {
    initialiseMenu.prompt();
  }
}

menu.addProjectBuildOptionPrompts = function () {
  return [new inquirer.Separator('Build Options')]
    .concat(buildCommands)
    .concat(new inquirer.Separator());
};

menu.projectPrompt = function () {
  return [
    new inquirer.Separator(),
    new inquirer.Separator('Projects'),
    new inquirer.Separator(),
    generatorUtil.listProjects()
  ];
};

module.exports = menu;
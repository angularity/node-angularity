'use strict';

/**
 * The main prompts for Angularity's command line interface.
 */
var inquirer = require('inquirer'),
gulp         = require('gulp'),
gulpUtil     = require('gulp-util'),
fs           = require('fs'),
_            = require('lodash');

var generatorUtil = require('./../generator/generator').util,
    generator     = require('./../generator/generator'),
    config        = require('../config');

require('shelljs/global');
generator.requireProjects();

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
    'Version ' + version + '\n';

  console.log(art);

  inquirer.prompt(menu.mainMenuPrompt(), handleMainMenu);
};

menu.mainMenuPrompt = function () {
  var menuItems = [];
  var message = '';

  if (config.projectConfigPresent && config.npmConfigPresent) {
    menuItems = menu.addProjectBuildOptionPrompts();
    message = ['Angularity Project \n   ', config.npmConfig.name,
      ' v.', config.npmConfig.version, '\n'].join('');
  } else {
    message = 'Welcome to Angularity';
    menuItems.push(
      new inquirer.Separator('No project was found in your current working directory.'));
  }

  menuItems.push('Generate Project');
  menuItems.push(new inquirer.Separator());
  //menuItems.push('Setup');
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

  if (taskName === 'generate project')
    menu.promptGeneratorMenu();
  else if (valid)
    gulp.start(taskName);
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

menu.promptGeneratorMenu = function () {
  var choices = [];
  var projects = generatorUtil.listProjects();

  choices.push(new inquirer.Separator());

  _.forEach(projects, function (project) {
    choices = choices.concat(project);
  });

  var menuItems = {
    type   : 'list',
    name   : 'projectTemplateName',
    message: 'Choose a project to generate',
    choices: choices,
    filter : function (value) {
      value = value.toLowerCase();
      value = value.replace(' ', '_');
      return value;
    }
  };

  inquirer.prompt(menuItems, function (answer) {
    menu.promptCreateGenerator(answer.projectTemplateName);
  });

};

menu.promptCreateGenerator = function (projectTemplateName) {
  var message, choices;

  var project = generator.createProject(projectTemplateName);
  generator.currentProject = project;

  if (config.projectConfigPresent) {
    message = 'Warning your current working directory already has a project.\n' +
    'You must enter a new location to generate a project';
    choices = ['Enter a Location', 'cancel'];

  } else if (fs.exists(project.destination)) {
    message = 'There is already a folder at the destination';
    choices = ['Enter a Location', 'replace', 'cancel'];

  } else {
    message = 'Do you want to create a project in the directory?\n' +
    gulpUtil.colors.red(project.destination);
    choices = ['y', 'Enter a Location', 'cancel'];
  }

  var menuItems = {
    type   : 'list',
    name   : 'choice',
    message: message,
    choices: choices,
    filter : function (value) {
      value = value.toLowerCase();
      return value;
    }
  };

  inquirer.prompt(menuItems, function (answer) {
    if (answer.choice === 'y')
      gulp.start(projectTemplateName);
    else if (answer.choice === 'enter a location')
      menu.promptProjectLocation(project);
  });
};

menu.promptProjectLocation = function (project) {

  var message = 'Enter a local absolute path you wish to create this project.';

  var menuItems = {
    type   : 'input',
    name   : 'choice',
    message: message,
    filter : function (value) {
      return value;
    }
  };

  inquirer.prompt(menuItems, function (answer) {
    project.destination = answer.choice;

    if (fs.existsSync(answer.choice))
      gulp.start(project.projectType);
    else
      menu.promptConfirmNewDestination(project);
  });

};

menu.promptConfirmNewDestination = function (project) {

  var message = 'The location\n' + project.destination + '\ndoes not exist, are you sure you want it created?';

  var choices = ['y', 'Cancel'];

  var menuItems = {
    type   : 'list',
    name   : 'choice',
    message: message,
    choices: choices,
    filter : function (value) {
      return value.toLowerCase();
    }
  };

  inquirer.prompt(menuItems, function (answer) {
    if (answer.choice === 'y')
      gulp.start(project.projectType);
  });

};

module.exports = menu;


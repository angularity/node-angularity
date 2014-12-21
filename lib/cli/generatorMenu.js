'use strict';

var inquirer = require('inquirer'),
    fs       = require('fs'),
    gulp     = require('gulp'),
    gulpUtil = require('gulp-util'),
    _        = require('lodash');

var initialiseMenu = require('./initialiseMenu');
var generator = require('../generator/generator');
var generatorUtil = generator.util;

var generatorMenu = {};

generatorMenu.prompt = function () {
  var choices = [];
  var projects = generatorUtil.listProjects();

  choices.push(new inquirer.Separator());

  _.forEach(projects, function (project) {
    choices = choices.concat(project);
  });

  var menuItems = {
    type   : 'list',
    name   : 'type',
    message: 'Choose a project to generate',
    choices: choices,
    filter : function (value) {
      value = value.toLowerCase();
      value = value.replace(' ', '_');
      return value;
    }
  };

  inquirer.prompt(menuItems, function (answer) {
    generatorMenu.createGenerator(answer.type);
  });

};

generatorMenu.promptProjectName = function (project) {
  var message = 'What is the name of your new project?';

  var menuItems = {
    type   : 'input',
    name   : 'name',
    default: project.projectName,
    message: message,
    filter : function (value) {
      return value;
    }
  };

  inquirer.prompt(menuItems, function (answer) {
    project.setProjectName(answer.name);
    generatorMenu.promptProjectDestination(project);
  });
};

generatorMenu.promptProjectDestination = function (project) {
  var message, choices;

  if (generatorUtil.validateExistingProject(process.cwd())) {
    message = 'Warning your current working directory already has a project.\n' +
    'You must enter a new location to generate a project';
    choices = ['Enter a Location', 'continue', 'cancel'];

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
    if (answer.choice === 'y' || answer.choice === 'continue') {
      gulp.start(project.projectType);
    } else if (answer.choice === 'enter a location') {
      generatorMenu.promptProjectLocation(project);
    }
  });
};

generatorMenu.createGenerator = function (type) {
  var project = generator.createProject(type);
  generator.currentProject = project;

  generatorMenu.promptProjectName(project);
};

generatorMenu.promptProjectLocation = function (project) {
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

    if (fs.existsSync(answer.choice)) {
      gulp.start(project.projectType);
    } else {
      generatorMenu.promptConfirmNewDestination(project);
    }
  });
};

generatorMenu.promptConfirmNewDestination = function (project) {
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
    if (answer.choice === 'y') {
      gulp.start(project.projectType);
    }
  });
};

module.exports = generatorMenu;
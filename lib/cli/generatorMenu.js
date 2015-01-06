'use strict';

var inquirer = require('inquirer'),
    fs       = require('fs'),
    gulp     = require('gulp'),
    gulpUtil = require('gulp-util');

var generator     = require('../generator/generator');
var generatorUtil = generator.util;

function prompt() {
  var choices = [new inquirer.Separator()]
      .concat(generatorUtil.listProjects())
      .concat('cancel');
  var menuPrompt = {
    type   : 'list',
    name   : 'choice',
    message: 'Choose a project to generate',
    choices: choices,
    filter : function (value) {
      return value.toLowerCase().replace(' ', '_');
    }
  };
  function handleMenu(answer) {
    if (answer.choice !== 'cancel') {
      createGenerator(answer.choice);
    }
  }
  inquirer.prompt(menuPrompt, handleMenu);
}

function promptProjectName(project) {
  var menuPrompt = {
    type   : 'input',
    name   : 'name',
    default: project.projectName,
    message: 'What is the name of your new project?'
  };
  function handleMenu(answer) {
    project.setProjectName(answer.name);
    promptProjectDestination(project);
  }
  inquirer.prompt(menuPrompt, handleMenu);
}

function promptProjectDestination(project) {
  var message, choices;

  if (generatorUtil.validateExistingProject(process.cwd())) {
    choices = ['Enter a Location', 'continue', 'cancel'];
    message = [
      'Warning your current working directory already has a project.',
      'You must enter a new location to generate a project.'
    ].join('\n');

  } else if (fs.exists(project.destination)) {
    choices = ['Enter a Location', 'replace', 'cancel'];
    message = 'There is already a folder at the destination';

  } else {
    choices = ['y', 'Enter a Location', 'cancel'];
    message = [
      'Do you want to create a project in the directory?',
      gulpUtil.colors.red(project.destination)
    ].join('\n');
  }
  var menuPrompt = {
    type   : 'list',
    name   : 'choice',
    message: message,
    choices: choices,
    filter : function (value) {
      return value.toLowerCase();
    }
  };
  function handleMenu(answer) {
    switch(answer.choice) {
      case 'y':
      case 'continue':
        gulp.start(project.projectType);
        break;
      case 'enter a location':
        promptProjectLocation(project);
        break;
      case 'cancel':
        break;
      default:
        throw new Error('Unrecognised choice: ' + answer.choice)
    }
  }
  inquirer.prompt(menuPrompt, handleMenu);
}

function createGenerator(type) {
  var project = generator.createProject(type);
  generator.currentProject = project;
  promptProjectName(project);
}

function promptProjectLocation(project) {
  var menuPrompt = {
    type   : 'input',
    name   : 'choice',
    message: 'Enter a local absolute path you wish to create this project.',
    filter : function (value) {
      return value;
    }
  };
  function handleMenu(answer) {
    project.destination = answer.choice;
    if (fs.existsSync(answer.choice)) {
      gulp.start(project.projectType);
    } else {
      promptConfirmNewDestination(project);
    }
  }
  inquirer.prompt(menuPrompt, handleMenu);
}

function promptConfirmNewDestination(project) {
  var menuPrompt = {
    type   : 'list',
    name   : 'choice',
    message: [
      'The location',
      project.destination ,
      'does not exist, are you sure you want it created?'
    ].join('\n'),
    choices: ['y', 'cancel'],
    filter : function (value) {
      return value.toLowerCase();
    }
  };
  function handleMenu(answer) {
    if (answer.choice === 'y') {
      gulp.start(project.projectType);
    }
  }
  inquirer.prompt(menuPrompt, handleMenu);
}

module.exports = {
  prompt: prompt
};
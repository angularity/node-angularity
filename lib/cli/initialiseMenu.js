'use strict';

var fs   = require('fs'),
    path = require('path');

var generatorUtil = require('../generator/generator').util;
var Menu = require('./MenuPrompt');
var configDefaults = require('../config/configDefaults');
var compileTargets = configDefaults.compileTargets;
var generatorMenu = require('./generatorMenu');

var initialiseMenu = {};

initialiseMenu.prompt = function () {
  initialiseMenu.initialise(process.cwd())
};

initialiseMenu.initialise = function (directory) {
  initialiseMenu.directory = directory;

  var configExists = generatorUtil.validateConfigExists(directory);

  if (generatorUtil.validateExistingProject(directory)) {
    console.error('It appears you already have an angularity project in this directory', directory);
  } else if (generatorUtil.validateProjectDirectories(directory)) {
    if (!configExists) {
      console.log('It appears that you are missing an angularity.json, lets generate one.', directory);
      initialiseMenu.promptConfig(initialiseConfig);
    }
  } else {
    console.log('There is no project in your current working directory, here are the projects you can generate.');
    generatorMenu.prompt();
  }
};

initialiseMenu.promptConfig = function (callback) {
  var menu = new Menu();

  menu.askText('name', 'What is the name of your project?', configDefaults.projectConfig.name);
  menu.askText('version', 'Do you want to specify a different version than..?', configDefaults.projectConfig.version);
  menu.askText('author', 'Who is the author of this project?', 'Bob');
  menu.askText('description', 'Do you want to specify a short description of this project?');
  menu.askList('javascriptVersion', 'What version of JavaScript do you want to use?',
    [compileTargets.ES6, compileTargets.ES5]);
  menu.askText('serverHttpPort', 'What http port do you want for the local development server?',
    Math.floor(Math.random() * 9000) + 1000);

  menu.run()
    .then(callback);
};

function initialiseConfig(config) {
  generatorUtil.createAngularityProjectConfig(initialiseMenu.directory, config);
}

module.exports = initialiseMenu;
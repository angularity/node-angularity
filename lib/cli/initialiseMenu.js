'use strict';

var fs   = require('fs'),
    path = require('path');

var generatorUtil  = require('../generator/generator').util,
    Menu           = require('./MenuPrompt'),
    generatorMenu  = require('./generatorMenu'),
    configDefaults = require('../config/defaults'),
    compileTargets = configDefaults.compileTargets,
    projectConfig  = configDefaults.projectConfig;

var initDirectory;

function prompt() {
  initialise(process.cwd())
}

function initialise(directory) {
  initDirectory = directory;

  if (generatorUtil.validateExistingProject(directory)) {
    console.error('It appears you already have an angularity project in this directory', directory);

  } else if (!generatorUtil.validateProjectDirectories(directory)) {
    console.log('There is no project in your current working directory, here are the projects you can generate.');
    generatorMenu.prompt();

  } else if (!generatorUtil.validateConfigExists(directory)) {
    console.log('It appears that you are missing an angularity.json, lets generate one.', directory);
    initialiseMenu.promptConfig(initialiseConfig);
  }
}

function promptConfig(callback) {
  var PORT  = Math.floor(Math.random() * 9000) + 1000;
  var ITEMS = [
    ['name', 'What is the name of your project?', projectConfig.name],
    ['version', 'Do you want to specify a different version than..?', projectConfig.version],
    ['author', 'Who is the author of this project?', 'Bob'],
    ['description', 'Do you want to specify a short description of this project?'],
    ['javascriptVersion', 'What version of JavaScript do you want to use?',[compileTargets.ES6, compileTargets.ES5]],
    ['serverHttpPort', 'What http port do you want for the local development server?', PORT]
  ]
  var menu = new Menu();
  ITEMS.forEach(function(item) {
    menu.askText.apply(menu, item); // @impaler - if this is the only use of Menu should we not inline this call?
  });
  menu.run()
    .then(callback);
}

function initialiseConfig(config) {
  generatorUtil.createAngularityProjectConfig(initDirectory, config);
}

module.exports = {
  prompt:           prompt,
  initialise:       initialise,
  promptConfig:     promptConfig,
  initialiseConfig: initialiseConfig
};
'use strict';

var fs = require('fs');
var path = require('path');
var Menu = require('./MenuPrompt');

var compileTargets = require('../config/configDefaults').compileTargets;
var generatorUtil = require('./../generator/generator').util;

var initialise = {};

initialise.directory = function (directory) {
  initialise.directory = directory;

  var menu = new Menu();

  menu.askText('name', 'What is the name of your project?', 'angularity-project');
  menu.askText('version', 'Do you want to specify a different version than..?', '1.0.0');
  menu.askText('author', 'Who is the author of this project?', 'Bob');
  menu.askText('description', 'Do you want to specify a short description of this project?');
  menu.askList('javascriptVersion', 'What version of JavaScript do you want to use?',
    [compileTargets.ES6, compileTargets.ES5]);
  menu.askText('serverHttpPort', 'What http port do you want for the local development server?',
    Math.floor(Math.random() * 9000) + 1000);

  menu.run()
    .then(initialiseConfig);
};

function initialiseConfig(config) {
  generatorUtil.createAngularityProjectConfig(initialise.directory, config);
}

/**
 * Shortcut to check if a directory has an Angularity project at a specific directory.
 * Basic check only looks for the config file and some required folders.
 * @param directory
 * @returns {*}
 */
initialise.validateExistingProject = function (directory) {
  return (
  fs.existsSync(path.join(directory, 'src', 'js-lib')) &&
  fs.existsSync(path.join(directory, 'src', 'target')) &&
  fs.existsSync(path.join(directory, 'angularity.json'))
  );
};

module.exports = initialise;
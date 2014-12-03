'use strict';

var generatorUtil = require('../generator/generator').util,
    inquirer      = require('inquirer'),
    path          = require('path'),
    fs            = require('fs'),
    webStorm      = require('../generator/templates/webStorm'),
    ideTemplate   = require('ide-template');

require('shelljs/global');

var menu = {};

menu.prompt = function () {
  var choices = ['External Tools', 'File Templates'];
  var message = 'Choose which WebStorm settings to install.';

  var menuItems = {
    type   : 'list',
    name   : 'choice',
    choices: choices,
    message: message,
  };

  inquirer.prompt(menuItems, handleInstallMenu);
};

function handleInstallMenu(answer) {
  var taskName = answer.choice;

  if (taskName === 'External Tools') {
    menu.promptExternalTools();
  } else if (taskName === 'File Templates') {
    menu.promptFileTemplates();
  }
}

menu.promptFileTemplates = function () {
  var choices = ['es5', 'es6'];
  var message = 'What Javascript version of the File Templates do you want to install?';

  var menuItems = {
    type   : 'list',
    name   : 'choice',
    choices: choices,
    message: message,
  };

  inquirer.prompt(menuItems, function (answer) {
    webStorm.copyFileTemplates(answer.choice);
  });
};

menu.promptExternalTools = function () {
  var message = 'Setup will install External tools for running Angularity in WebStorm.';
  var choices;
  var existingExternalToolsPath = path.join(ideTemplate.webStorm.userPreferences(), 'tools', 'Angularity.xml');
  var existingTools = fs.existsSync(existingExternalToolsPath);

  if (existingTools) {
    message = 'You already have an External Tool setup for Angularity.';
    choices = ['override', 'cancel'];
  } else {
    choices = ['continue', 'cancel'];
  }

  var menuItems = {
    type   : 'list',
    name   : 'choice',
    choices: choices,
    message: message
  };

  inquirer.prompt(menuItems, function (answer) {
    console.log('If you have WebStorm open, please restart it.');

    if (answer.choice === 'continue') {
      generatorUtil.generateAngularityWebStormTools();

    } else if ('override') {
      console.log('overriding exiting Angularity.xml');
      rm(existingExternalToolsPath);
      webStorm.generateAngularityWebStormTools();
    }
  });
};

menu.initialiseGlobalAngularityConfig = function () {
  console.log('\nWelcome to Angularity, \ndefault settings are being written to a global configuration.\n');
  console.log('\nTo change your defaults edit your ' + ideTemplate.util.HOME() + '/.angularity file');

  //todo check for latest version of angularity global install

  generatorUtil.createAngularityGlobalConfig();
};

module.exports = menu;
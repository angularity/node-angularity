'use strict';

var generatorUtil = require('../generator/generator').util,
    inquirer      = require('inquirer'),
    path          = require('path'),
    fs            = require('fs'),
    ideTemplate   = require('ide-template');

require('shelljs/global');

var menu = {};

menu.promptAngularityInstall = function () {
  console.log('\nWelcome to Angularity, \ndefault settings are being written to a global configuration.\n');
  console.log('\nTo change your defaults edit your ' + ideTemplate.HOME() + '/.angularity file');

  //todo check for latest version of angularity global install

  generatorUtil.createAngularityConfig();
};

menu.promptSetupMenu = function () {
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
    message: message,
    filter : function (value) {
      return value;
    }
  };

  inquirer.prompt(menuItems, function (answer) {
    console.log('If you have WebStorm open, please restart it.');

    if (answer.choice === 'continue') {
      copyAngularityExternalTools();
    } else if ('override') {
      console.log('overriding exiting Angularity.xml');
      rm(existingExternalToolsPath);
      copyAngularityExternalTools();
    }
  });

  function copyAngularityExternalTools() {
    var externalToolsSource = path.resolve(__dirname, '../', './generator/templates/idea/tools/Angularity.xml');
    ideTemplate.webStorm.copyExternalTools(externalToolsSource);
  }

};

module.exports = menu;
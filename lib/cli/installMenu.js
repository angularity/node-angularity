'use strict';

var generatorUtil = require('../generator/generator').util,
    inquirer      = require('inquirer'),
    path          = require('path'),
    fs            = require('fs'),
    webStorm      = require('../generator/templates/webStorm'),
    ideTemplate   = require('ide-template');

require('shelljs/global');

function prompt() {
  var menuPrompt = {
    type   : 'list',
    name   : 'choice',
    choices: ['External Tools', 'File Templates'],
    message: 'Choose which WebStorm settings to install.',
    filter : function (value) {
      return value.toLowerCase();
    }
  };
  function handleMenu(answer) {
    var taskName = answer.choice;
    switch (taskName) {
      case 'external tools':
        promptExternalTools();
        break;
      case 'file templates':
        promptFileTemplates();
        break;
      default:
        throw new Error('unrecognised task: ' + taskName)
    }
  }
  inquirer.prompt(menuPrompt, handleMenu);
}

function promptFileTemplates() {
  var menuPrompt = {
    type   : 'list',
    name   : 'choice',
    choices: ['es5', 'es6'],
    message: 'What Javascript version of the File Templates do you want to install?',
    filter : function (value) {
      return value.toLowerCase();
    }
  };
  function handleMenu(answer) {
    webStorm.copyFileTemplates(answer.choice);
    var templateFolder = path.join(generatorUtil.commonTemplatesPath(), 'idea', 'fileTemplates', answer.choice);
    console.log('\nSuccessfully copied file templates to', templateFolder);
    console.log('Now after restarting WebStorm you will have Angular file templates in your File New menu.');
  }
  inquirer.prompt(menuPrompt, handleMenu);
};

function promptExternalTools() {
  var externalToolPath = path.join(ideTemplate.webStorm.userPreferences(), 'tools', 'Angularity.xml');
  var hasExisting      = fs.existsSync(externalToolPath);
  var message    = hasExisting ?
      'You already have an External Tool setup for Angularity.' :
      'Setup will install External tools for running Angularity in WebStorm.';
  var choices    = hasExisting ? ['override','cancel'] : ['continue', 'cancel'];
  var menuPrompt = {
    type   : 'list',
    name   : 'choice',
    choices: choices,
    message: message,
    filter : function (value) {
      return value.toLowerCase();
    }
  };
  function handleMenu(answer) {
    console.log('If you have WebStorm open, please restart it.');
    if (answer.choice === 'continue') {
      webStorm.generateAngularityWebStormTools();
    } else if ('override') {
      console.log('overriding exiting Angularity.xml');
      rm(externalToolPath);
      webStorm.generateAngularityWebStormTools();
    }
    console.log('\nSuccessfully wrote WebStorm External Tools to your', externalToolPath);
    console.log('Now after restarting WebStorm you will have Angularity in your ' +
    'window toolBar menu under Tools->Angularity');
  }
  inquirer.prompt(menuPrompt, handleMenu);
};

function initGlobalConfig() {
  console.log('\nWelcome to Angularity, \ndefault settings are being written to a global configuration.\n');
  console.log('\nTo change your defaults edit your ' + ideTemplate.util.HOME() + '/.angularity file');

  //TODO check for latest version of angularity global install

  generatorUtil.createAngularityGlobalConfig();
};

module.exports = {
  prompt:           prompt,
  initGlobalConfig: initGlobalConfig
};
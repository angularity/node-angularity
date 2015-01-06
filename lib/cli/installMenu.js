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
    switch (answer.choice) {
      case 'external tools':
        promptExternalTools();
        break;
      case 'file templates':
        promptFileTemplates();
        break;
      default:
        throw new Error('Unrecognised choice: ' + answer.choice)
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
    var templateFolder = webStorm.copyFileTemplates(answer.choice);
    console.log([
      '',
      'Copied file templates to ' + templateFolder,
      'In WebStorm you will have angularity templates in menu File->New.'
    ].join('\n'));
  }
  inquirer.prompt(menuPrompt, handleMenu);
};

function promptExternalTools() {
  var externalToolPath = path.join(ideTemplate.webStorm.userPreferences(), 'tools', 'Angularity.xml');
  var hasExisting      = fs.existsSync(externalToolPath);
  var message    = hasExisting ?
      'You already have an External Tool setup for Angularity.' :
      'Setup will install External tools for running Angularity in WebStorm.';
  var choices    = hasExisting ? ['overwrite','cancel'] : ['continue', 'cancel'];
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
    switch(answer.choice) {
      case 'continue':
        webStorm.generateAngularityWebStormTools();
        break;
      case 'overwrite':
        console.log('overriding exiting Angularity.xml');
        rm(externalToolPath);
        webStorm.generateAngularityWebStormTools();
        console.log([
          '',
          'Wrote WebStorm to ' + externalToolPath + '.',
          'In Webstorm you can launch Angularity builds in menu Tools->Angularity.'
        ].join('\n'));
        break;
      default:
        throw new Error('Unrecognised choice: ' + answer.choice)
    }
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
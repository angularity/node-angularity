'use strict';

var generatorUtil = require('../generator/generator').util,
    inquirer      = require('inquirer'),
    ideTemplate   = require('ide-template');

var menu = {};

menu.promptAngularityInstall = function () {
  console.log('\nWelcome to Angularity, \ndefault settings are being written to a global configuration.\n');
  console.log('\nTo change your defaults edit your ' + ideTemplate.HOME() + '/.angularity file');

  //todo check for latest version of angularity global install

  generatorUtil.createAngularityConfig();
};

// todo webstorm templates
menu.addSettingsWebStormPrompts = function () {
  return [
    new inquirer.Separator('WebStorm'),
    'File Templates',
    'External Tools',
    new inquirer.Separator()
  ];
};

module.exports = menu;
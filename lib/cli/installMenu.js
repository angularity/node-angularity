'use strict';

var generatorUtil = require('../generator/generator').util,
    ideTemplate   = require('ide-template'),
    menu          = {};

menu.promptAngularityInstall = function () {
  console.log('\nWelcome to Angularity, \ndefault settings are being written to a global configuration.\n');
  console.log('\nTo change your defaults edit your ' + ideTemplate.HOME() + '/.angularity file');

  generatorUtil.createAngularityConfig();
};

module.exports = menu;
'use strict';

/**
 * Utility for reading the angularity configuration files.
 *
 * By default the config is a `angularity.json` that is located at the root
 * of an angularity project.
 *
 * This utility also makes sure that the package.json of the project is kept in sync with
 * angularity so that it can be distributed with npm.
 *
 * @type {exports} Object
 */
var fs = require('fs'),
path   = require('path');

var installMenu = require('./cli/installMenu');

function Config() {
  var self = this;

  self.ES5 = 'ES5';
  self.ES6 = 'ES6';
  self.isMinify = (process.argv[process.argv.length - 1] !== 'nominify');

  // Load angularity's global config file from the user's Home directory.
  var configPath = path.join(require('ide-template').HOME(), '.angularity');
  self.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!validateAngularityConfig(this.config))
    console.error('There was an issue validating your .angularity file.');

  // Load the project's config and validate it
  initialiseProjectConfig();

  // Load the npm package.json and validate it
  initialiseNPMConfig();

  // Keep the version numbers in sync between the npm and angularity configs.
  synchroniseConfigs();

//todo use a schema library like... https://github.com/apiaryio/Amanda
  function validateConfig(configData) {
    return ( typeof configData.name !== 'undefined' &&
    typeof configData.version !== 'undefined');
  }

  function validateAngularityConfig(configData) {
    return ( typeof configData.serverHttpPort !== 'undefined' &&
    typeof configData.javascriptVersion !== 'undefined' &&
    typeof  configData.consoleWidth !== 'undefined');
  }

  function initialiseProjectConfig() {
    self.projectConfigPath = path.join(process.cwd(), 'angularity.json');
    self.projectConfigPresent = fs.existsSync(self.projectConfigPath);

    if (self.projectConfigPresent) {
      self.projectConfig = require(self.projectConfigPath);

      if (!validateConfig(self.projectConfig))
        console.error('There was an issue validating your angularity.json file.');
    } else {
      self.projectConfig = {
        consoleWidth          : 80,
        serverPort            : 999,
        JAVASCRIPT_TARGET     : self.ES5,
        webstormExecutablePath: ''
      };
    }
  }

  function initialiseNPMConfig() {
    self.npmConfigPath = path.join(process.cwd(), 'package.json');
    self.npmConfigPresent = fs.existsSync(self.npmConfigPath);

    if (self.npmConfigPresent) {
      self.npmConfig = require(self.npmConfigPath);

      if (!validateConfig(self.npmConfig))
        console.error('There was an issue validating your package.json file.');
    }
    return self.npmConfigPresent;
  }

  function synchroniseConfigs() {
    if (self.projectConfigPresent && self.npmConfigPresent) {
      // todo prompt to fs.write the highest version...
      if (self.projectConfig.version !== self.npmConfig.version) {
        console.log('Your project\'s npm version is out of sync with your angularity.json');
        process.exit(1);
      }
    }
  }
}

/**
 * Resolve a config value by order of priority,
 * Use the project specific angularity.json first,
 * then the global .angularity in the local HOME directory.
 * @param name
 * @returns {*}
 */
Config.prototype.resolveConfigValue = function (name) {
  if (this.projectConfig[name])
    return this.projectConfig[name];

  else if (this.config[name])
    return this.config[name];
};

/* Configurable methods that use the resolve override */

Config.prototype.consoleWidth = function () {
  return this.resolveConfigValue('consoleWidth');
};

Config.prototype.serverHttpPort = function () {
  //Math.floor(Math.random() * 9000) + 1000
  return this.resolveConfigValue('serverHttpPort');
};

Config.prototype.javascriptVersion = function () {
  //validate string values case sensitivity etc
  return this.resolveConfigValue('javascriptVersion');
};

Config.prototype.webstormExecutablePath = function () {
  return this.resolveConfigValue('webstormExecutablePath');
};

Config.prototype.minify = function () {
  return this.resolveConfigValue('minify');
};

module.exports.init = function () {

  var configPath = path.join(require('ide-template').HOME(), '.angularity');
  var configPresent = fs.existsSync(configPath);

  if (configPresent) {
    createInstance();
  } else {
    installMenu.promptAngularityInstall();
    createInstance();
  }

  function createInstance() {
    // Redundant var but lets WebStorm autocomplete
    var configInstance = new Config();
    module.exports = configInstance;
  }
};
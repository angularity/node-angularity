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
'use strict';

var fs   = require('fs'),
    _    = require('lodash'),
    path = require('path');

var installMenu = require('./../cli/installMenu');
var templateUtil = require('ide-template').util;
var configValues = require('./configDefaults');

function Config() {
  var self = this;

  self.values = configValues;
  self.isMinify = (process.argv[process.argv.length - 1] !== 'nominify');

  // Load angularity's global config file from the user's Home directory.
  self.globalConfigPath = path.join(templateUtil.HOME(), '.angularity');
  self.globalConfig = JSON.parse(fs.readFileSync(self.globalConfigPath, 'utf8'));
  self.npmConfigPath = path.join(process.cwd(), 'package.json');
  self.projectConfigPath = path.join(process.cwd(), 'angularity.json');
  self.bowerConfigPath = path.join(process.cwd(), 'bower.json');

  if (!validateAngularityConfig(this.globalConfig)) {
    console.error('There was an issue validating your .angularity file.');
  }

  // Load all the project's config files and validate them
  initialiseProjectConfig();
  initialiseNPMConfig();
  initialiseBowerConfig();

  // Keep the config file's version numbers in sync
  synchroniseConfigs();

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
    self.projectConfigPresent = fs.existsSync(self.projectConfigPath);

    if (self.projectConfigPresent) {
      self.projectConfig = require(self.projectConfigPath);

      if (!validateConfig(self.projectConfig)) {
        console.error('There was an issue validating your angularity.json file.');
        //todo handle error with prompt
      }
    }
  }

  function initialiseNPMConfig() {
    self.npmConfigPresent = fs.existsSync(self.npmConfigPath);

    if (self.npmConfigPresent) {
      self.npmConfig = require(self.npmConfigPath);

      if (!validateConfig(self.npmConfig)) {
        console.error('There was an issue validating your package.json file.');
        //todo handle error with prompt
      }
    }
    return self.npmConfigPresent;
  }

  function initialiseBowerConfig() {
    self.bowerConfigPresent = fs.existsSync(self.bowerConfigPath);

    if (self.bowerConfigPresent) {
      self.bowerConfig = require(self.bowerConfigPath);

      if (!validateConfig(self.bowerConfig)) {
        console.error('There was an issue validating your bower.json file.');
        //todo handle error with prompt
      }
    }
    return self.bowerConfigPresent;
  }

  /**
   * Determine the highest SemVersion between a project's bower, npm and angularity configs.
   * If the versions are out of sync, update the config files with the highest version.
   */
  function synchroniseConfigs() {
    //todo remove dependency of bower config
    if (self.projectConfigPresent && self.npmConfigPresent && self.bowerConfigPresent) {
      synchroniseConfigVersions();
      synchroniseConfigNames();

      saveConfigs();
    }
  }

  function synchroniseConfigVersions() {
    if (!allEqual([
        parseVersionFloat(self.projectConfig.version),
        parseVersionFloat(self.npmConfig.version),
        parseVersionFloat(self.bowerConfig.version)
      ])) {

      var values = [
        {name: 'angularity.json', version: self.projectConfig.version},
        {name: 'package.json', version: self.npmConfig.version},
        {name: 'bower.json', version: self.bowerConfig.version}
      ];

      var highest = highestSemVersion(values);

      console.warn('Your configuration versions are out of sync, the highest version',
        highest.version, 'from your', highest.name, 'will now be used for all.');

      self.projectConfig.version = highest.version;
      self.npmConfig.version = highest.version;
      self.bowerConfig.version = highest.version;
    }
  }

  function synchroniseConfigNames() {
    if (!allEqual([self.projectConfig.name, self.npmConfig.name, self.bowerConfig.name])) {

      console.warn('Your configuration names are out of sync.' +
      'The name specified in the project\'s angularity.json will be used for all.');

      self.npmConfig.name = self.projectConfig.name;
      self.bowerConfig.name = self.projectConfig.name;
    }
  }

  /**
   * Update all the project json configs on the disk based on the objects in this config class.
   */
  function saveConfigs() {
    var projectConfig = JSON.stringify(self.projectConfig, null, 4);
    fs.writeFileSync(self.projectConfigPath, projectConfig);

    var npmConfig = JSON.stringify(self.npmConfig, null, 4);
    fs.writeFileSync(self.npmConfigPath, npmConfig);

    var bowerConfig = JSON.stringify(self.bowerConfig, null, 4);
    fs.writeFileSync(self.bowerConfigPath, bowerConfig);
  }

  /**
   * Based on an Array of objects containing name and a version in sem version syntax
   * return the object with the highest version.
   *
   * @param versions
   * @returns {*}
   */
  function highestSemVersion(versions) {
    var results = [];

    _.forEach(versions, function (value) {
      results.push({value: value.version, float: parseVersionFloat(value.version)});
    });

    results = results.sort(function (a, b) {
      return b.float - a.float;
    });

    var highestVersion = results[0].value;

    return _.filter(versions, function (num) {
      return num.version === highestVersion;
    })[0];
  }

  /**
   * Given an semVersion String, calculate a Float value that respects it's
   * SemVersion highest value to be used when comparing versions together.
   * @param semVersion
   * @returns {number}
   */
  function parseVersionFloat(semVersion) {
    var versionFloat = 0;
    var versionsSplit = ('' + semVersion)
      .replace(/[^0-9.]/g, '')
      .split('.');

    for (var i = 0; i < versionsSplit.length; ++i) {
      versionFloat += Number(versionsSplit[i]) / Math.pow(10, i * 3);
    }
    return versionFloat;
  }

  /**
   * Determine if all the values in an Array are all equal to each other.
   * @param values
   * @returns {boolean}
   */
  function allEqual(values) {
    for (var i = 0; i < values.length; i++) {
      if (values[i] === null) {
        return false;
      }
      for (var j = 0; j < i; j++) {
        if (values[j] !== values[i]) {
          return false;
        }
      }
    }
    return true;
  }
}

/**
 * Resolve a config value by order of priority,
 * Use the project specific angularity.json first if it is defined,
 * then the global .angularity in the local HOME directory.
 * @param name
 * @returns {*}
 */
Config.prototype.resolveConfigValue = function (name) {
  if (this.projectConfig && this.projectConfig[name]) {
    return this.projectConfig[name];

  } else if (this.globalConfig[name]) {
    return this.globalConfig[name];

  } else {
    console.error('Cannot resolve the config value of', name, 'in the project config', this.projectConfigPath,
        'or the global angularity config', this.globalConfigPath);
  }
};

/**
 * Configurable getter methods for resolving the config values for the Angularity configurations.
 * The getters will use the resolveConfigValue to let project specific overrides.
 */

Config.prototype.consoleWidth = function () {
  return this.resolveConfigValue('consoleWidth');
};

Config.prototype.serverHttpPort = function () {
  return this.resolveConfigValue('serverHttpPort');
};

Config.prototype.javascriptVersion = function () {
  //validate string values case sensitivity etc
  return this.resolveConfigValue('javascriptVersion');
};

Config.prototype.webstormExecutablePath = function () {
  return this.resolveConfigValue('webstormExecutablePath');
};

/**
 * Initialise the global angularity install.
 * A config file is created in the local Documents/Home folder named .angularity.
 * If there is no config file present the tool will generate one with default options.
 */
module.exports.init = function () {
  var globalConfigPath = path.join(templateUtil.HOME(), '.angularity');
  var globalConfigPresent = fs.existsSync(globalConfigPath);

  if (globalConfigPresent) {
    createInstance();
  } else {
    if (!globalConfigPresent) {
      installMenu.initialiseGlobalAngularityConfig();
    }
    createInstance();
  }

  function createInstance() {
    // Redundant var but lets WebStorm autocomplete
    var configInstance = new Config();
    module.exports = configInstance;
  }
};
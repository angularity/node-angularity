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

var fs     = require('fs'),
    merge  = require('lodash.merge'),
    reduce = require('lodash.reduce'),
    path   = require('path');

var installMenu    = require('./../cli/installMenu'),
    templateUtil   = require('ide-template').util,
    configDefaults = require('./defaults'),
    generatorUtil  = require('../generator/generator').util;

var CONFIG_PATH_GLOBAL  = path.join(templateUtil.HOME(), '.angularity'),
    CONFIG_PATH_PROJECT = path.join(process.cwd(), 'angularity.json'),
    CONFIG_PATH_NPM     = path.join(process.cwd(), 'package.json'),
    CONFIG_PATH_BOWER   = path.join(process.cwd(), 'bower.json');

/**
 * Retreive a method that tests a configuration for the requisite fields and prints an error message on failure
 * @param {object} types A lookup of the required types of fields in the config
 * @return {function({object}):{boolean}} Method that takes a configuration and tests its validity
 */
function getValidator(types) {
  return function(config) {
    var missing = reduce(types, function(result, type, field) {
        (typeof config[field] !== type) && result.push(field);
        return result;
      }, [ ]);
    if (missing.length) {
      var message = ['Error validating', path.basename(config._filename), 'field(s):']
        .concat(missing)
        .join(' ');
      console.error(message);
      return false;
    } else {
      return true;
    }
  }
}

/**
 * Given a semver string create a heuristic string that ranks the semver in the correct order.
 * To do this it applies leading zero padding such that all similar term is the same length across all given semvers.
 * @param {Array.<string>} candidates A list of semver strings
 * @returns {Array.<string>} A list of heuristics based on the given semvers
 */
function semverRankingHeuristic(candidates) {
  var maxLengths = [ ];
  return candidates
    .map(function split(candidate) {    // split the semver into terms and find the longest length of similar terms
      return String(candidate)
        .replace(/[^0-9.]/g, '')
        .split('.')
        .map(function measureEachTerm(value, i) {
          maxLengths[i] = Math.max(maxLengths[i], value.length) || value.length;
          return value;
        });
    })
    .map(function zeroPadding(split) {  // apply leading zero padding to equalise the length of the terms
      return split
        .forEach(function zeroPadEachTerm(value, i) {
          var length = maxLengths[i];
          return ((new Array(length)).join('0') + value).slice(-length);
        })
        .join('.');
    });
}

/**
 * Determine the highest SemVersion between a project's bower, npm and angularity configs.
 * If the versions are out of sync, update the config files with the highest version.
 * Candidates are expected to have a _filename field with the full file path.
 * @param {...object} config Any number of candidate configurations
 */
function synchroniseConfigs(config) {

  // the list of configurations (copy)
  var configurations = Array.prototype.slice.call(config);

  // a list of configurations that have been tainted
  var tainted = [ ];

  // create a heuristic of the version which may be safely sorted
  var versions = semverRankingHeuristic(configurations.map(function (config) {
    return config.version;
  }));

  // we can now find the configuration with the highest version
  var index   = versions.indexOf(versions.sort().pop());
  var highest = configurations[index];

  // normalise version
  var isEqualVersion = versions.every(function (versionFloat, i, array) {
    return (version === array[0]);
  });
  if (!isEqualVersion) {

    // warning message
    console.warn('Your configuration versions are out of sync, the highest version',
      highest.version, 'from your', path.basename(highest._filename), 'will now be used for all.');

    // amend the relevant configurations
    configurations.forEach(function (config) {
      if (config.version !== highest.version) {
        config.version = highest.version;
        (tainted.indexOf(config) < 0) && tainted.push(config);
      }
    });
  }

  // normalise name
  var isEqualName = configurations.every(function (config, i, array) {
    return (config.name === array[0].name);
  });
  if (!isEqualName) {
    var reference = configurations[0];

    // warning message
    console.warn('Your configuration names are out of sync. The name specified in the project\'s',
      path.basename(reference._filename), 'will be used for all.');

    // amend the relevant configurations
    configurations.forEach(function (config) {
      if (config.name !== reference.name) {
        config.name = reference.name;
        (tainted.indexOf(config) < 0) && tainted.push(config);
      }
    });
  }

  // save tainted configurations
  tainted.forEach(function (config) {
    var copy = merge(config, { filename: undefined });
    var text = JSON.stringify(copy, null, 2);
    fs.writeFileSync(config._filename, text);
  });
}

/**
 * Resolve a config value by order of priority,
 * Use the project specific angularity.json first if it is defined,
 * then the global .angularity in the local HOME directory.
 * @param {string} name
 * @returns {function}
 */
function configGetterFor(name) {
  return function() {
    if (this.projectConfig && this.projectConfig[name]) {
      return this.projectConfig[name];
    } else if (this.globalConfig[name]) {
      return this.globalConfig[name];
    } else {
      throw new Error(['Cannot resolve the config value of', name, 'in the project config', CONFIG_PATH_PROJECT,
          'or the global angularity config', CONFIG_PATH_GLOBAL].join(' '));
    }
  }
}
function Config() {
  var globalValidator = getValidator({
    serverHttpPort   : 'number',
    javascriptVersion: 'string',
    consoleWidth     : 'number'
  });
  var localValidator = getValidator({
    name   : 'string',
    version: 'string'
  });

  // Load angularity's global config file from the user's Home directory.
  this.globalConfig = merge({ _filename: CONFIG_PATH_GLOBAL }, JSON.parse(fs.readFileSync(CONFIG_PATH_GLOBAL, 'utf8')));
  globalValidator(this.globalConfig);

  // Load all the project's config files and validate them
  this.projectConfigPresent = fs.existsSync(CONFIG_PATH_PROJECT);
  if (this.projectConfigPresent) {
    this.projectConfig = merge({ _filename: CONFIG_PATH_PROJECT }, require(CONFIG_PATH_PROJECT));
    localValidator(this.projectConfig);
  }
  this.npmConfigPresent = fs.existsSync(CONFIG_PATH_NPM);
  if (this.npmConfigPresent) {
    this.npmConfig = merge({ _filename: CONFIG_PATH_NPM }, require(CONFIG_PATH_NPM));
    localValidator(this.npmConfig);
  }
  this.bowerConfigPresent = fs.existsSync(CONFIG_PATH_BOWER);
  if (this.bowerConfigPresent) {
    this.bowerConfig = merge({ _filename: CONFIG_PATH_BOWER }, require(CONFIG_PATH_BOWER));
    localValidator(this.bowerConfig);
  }

  // Keep the config file's version numbers in sync
  // TODO remove dependency of bower config
  var isAllPresent = [this.projectConfigPresent, this.npmConfigPresent, this.bowerConfigPresent].every(Boolean);
  if (isAllPresent) {
    synchroniseConfigs(this.projectConfig, this.npmConfig, this.bowerConfig);
  }
}

// TODO comment block
Config.prototype.values = configDefaults;

// TODO comment block
Config.prototype.isMinify = (process.argv.indexOf('nominify') < 0);

/**
 * Configurable getter methods for resolving the config values for the Angularity configurations.
 */
// TODO specific comment block for each method

Config.prototype.getConsoleWidth = configGetterFor('consoleWidth');

Config.prototype.getServerHttpPort = configGetterFor('serverHttpPort');

Config.prototype.getJavascriptVersion = configGetterFor('javascriptVersion');

Config.prototype.getWebstormExecutablePath = configGetterFor('webstormExecutablePath');

/**
 * Initialise the global angularity install.
 * A config file is created in the local Documents/Home folder named .angularity.
 * If there is no config file present the tool will generate one with default options.
 */
var globalConfigPresent = fs.existsSync(path.join(templateUtil.HOME(), '.angularity'));
if (!globalConfigPresent) {
    generatorUtil.createAngularityGlobalConfig();
}

module.exports = new Config();
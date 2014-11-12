'use strict';
/* globals cd, cp, mkdir, exec */

var fs          = require('fs'),
    path        = require('path'),
    ideTemplate = require('ide-template'),
    _           = require('lodash');

var config = require('../config');

require('shelljs/global');

/**
 * Utility methods common to generator tasks.
 * @type Object
 */
var util = {};
var projects = [];

/**
 * The tools absolute template folder path for config files, ide settings etc...
 * @type {*|string}
 */
util.commonTemplatesPath = path.join(__dirname, 'templates');

/**
 * Using the util.defaultGlobalConfig() and template generate the global .angularity config file.
 *
 * @param override template context
 */
util.createAngularityGlobalConfig = function (override) {
  var configTemplatePath = path.join(util.commonTemplatesPath, '.angularity');
  var configTemplate = fs.readFileSync(configTemplatePath);
  var context = util.defaultGlobalConfig();

  if (typeof override !== 'undefined') {
    context = _.merge(util.defaultGlobalConfig, override);
  }

  var configFileContent = _.template(configTemplate, context);
  fs.writeFileSync(path.join(ideTemplate.HOME(), '.angularity'), configFileContent, 'utf8');
};

/**
 * Using the util.createAngularityProjectConfig() and template generate a project specific angularity.json config file.
 * @param destination
 * @param override
 */
util.createAngularityProjectConfig = function (destination, override) {
  //todo angularity@1.0.1
  var configTemplatePath = path.join(util.commonTemplatesPath, 'angularity.json');
  var configTemplate = fs.readFileSync(configTemplatePath);
  var context = util.defaultProjectConfig();

  if (typeof override !== 'undefined') {
    context = _.merge(context, override);
  }

  var configFileContent = _.template(configTemplate, context);
  fs.writeFileSync(path.join(destination, 'angularity.json'), configFileContent, 'utf8');
};

/**
 * The default config context for creating a new Angularity global config.
 * @returns Object
 */
util.defaultGlobalConfig = function () {
  //todo use default config options from one json file.
  return {
    serverHttpPort        : Math.floor(Math.random() * 9000) + 1000,
    javascriptVersion     : config.ES6,
    webstormExecutablePath: ideTemplate.webStorm.getExecutable(),
    consoleWidth          : 80
  };
};

/**
 * The default config context for creating a new Angularity project config.
 * @returns Object
 */
util.defaultProjectConfig = function () {
  var config = require('../config');
  var defaultConfig = util.defaultGlobalConfig();

  return {
    name                  : 'angularity-project',//todo
    version               : '0.0.1',
    angularityVersion     : '0.0.1',//todo
    serverHttpPort        : config.serverHttpPort ? config.serverHttpPort() : defaultConfig.serverHttpPort,
    javascriptVersion     : config.javascriptVersion ? config.javascriptVersion() : defaultConfig.javascriptVersion,
    consoleWidth          : config.consoleWidth ? config.consoleWidth() : defaultConfig.consoleWidth,
    webstormExecutablePath: config.webstormExecutablePath
      ? config.webstormExecutablePath() : defaultConfig.webstormExecutablePath
  };
};

/**
 * Basic check on a folder path if a generator project exists.
 * @param projectPath
 * @returns {*}
 */
util.validGeneratorProject = function (projectPath) {
  return fs.existsSync(path.join(projectPath, 'index.js'));
};

/**
 * List all the generator projects in the local ./lib/generator/projects folder.
 * @returns {Array}
 */
util.listProjects = function () {
  var projectsPath = path.join(__dirname, 'projects');
  var existingProjects = [];
  var projectsDirectory = fs.readdirSync(String(projectsPath));

  _.forEach(projectsDirectory, function (project) {
    if (util.validGeneratorProject(path.join(projectsPath, project))) {
      existingProjects.push(project);
    }
  });

  projects = existingProjects;
  return projects;
};

/**
 * Copy a directory recursively to a given destination.
 * @param source
 * @param destination
 * @param copyRootFolder {Boolean} if true do not copy the root folder of the source path,
 *                           instead just copy it's contents.
 */
util.cpR = function (source, destination, copyRootFolder)
{
  copyRootFolder = copyRootFolder || false;

  if (!fs.existsSync(destination)) {
    mkdir('-p', destination);
  }

  if (copyRootFolder) {
    var originalCWD = process.cwd();
    cd(source);
    cp('-R', '.', destination);
    cd(String(originalCWD));
  } else {
    cp('-R', source, destination);
  }
};

/**
 * Basic npm install command to run the install programatically,
 * the current working directory of process will be unaltered.
 * @param destination
 */
util.npmInstall = function (destination) {
  var originalCWD = process.cwd();
  cd(destination);

  var npmInstallCode = exec('npm i').code;

  if (npmInstallCode > 0) {
    process.exit(npmInstallCode);
  }

  cd(String(originalCWD));
};

/**
 * The main Generator Project template.
 * @param type
 * @constructor
 */
function GeneratorProject(type) {
  var projectTypePath = path.join(__dirname, 'projects', type);
  var defaultProjectName = 'angularity-project';

  if (!fs.existsSync(projectTypePath)) {
    console.error('Error there does not seem to be a project with the name', type);
  }

  return {
    /**
     * The project type is the folder name of the generator project.
     * Eg: es5-minimal
     */
    projectType    : type,
    /**
     * The absolute path to the generator project template.
     */
    projectTypePath: projectTypePath,
    /**
     * The project name used by the generator to populate the config files, destination etc.
     */
    projectName    : defaultProjectName,
    /**
     * The absolute path the the generator project's template folder.
     */
    templatePath   : path.join(__dirname, 'projects', type, 'template'),
    /**
     * The generator project's destination path.
     */
    destination    : path.join(String(process.cwd()), defaultProjectName),

    /**
     * Set the main project name and update the destination path.
     * @param name
     */
    setProjectName: function (name) {
      this.projectName = name;
      this.destination = path.join(String(process.cwd()), name);
    },

    /**
     * Based on the current GeneratorProject object,
     * recursively copy all the project's files to the project's destination.
     */
    copyProjectTemplateFiles: function () {
      util.cpR(this.templatePath, this.destination, true);
    },

    /**
     * Based on the current GeneratorProject object,
     * create an Angularity Project Config and determine the destination automatically.
     * @param override
     */
    createAngularityProjectConfig: function (override) {
      util.createAngularityProjectConfig(this.destination, override);
    }
  };
}

/**
 * Require all the generator projects in the `./lib/generator/projects` folder.
 * This is used to populate the cli menu with the projects to generate.
 */
function requireProjects() {
  util.listProjects();

  _.forEach(projects, function (project) {
    var pathResolved = path.resolve(__dirname, '.' + path.sep, path.join('projects', project, 'index'));
    require(pathResolved);
  });
}

module.exports = {
  createProject  : function (type) {
    return new GeneratorProject(type);
  },
  currentProject : undefined,
  requireProjects: requireProjects,
  util           : util
};
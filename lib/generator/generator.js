'use strict';
/* globals cd, cp, mkdir, exec */

var fs          = require('fs'),
    path        = require('path'),
    gulp        = require('gulp'),
    ideTemplate = require('ide-template'),
    merge       = require('lodash.merge'),
    template    = require('lodash.template');

var config         = require('../config/config'),
    configDefaults = require('../config/defaults');

require('shelljs/global');

var projects = [];

/**
 * Create a new project by name.
 * Warning this creates the project without prompt, currently its is only being used
 * by the ci for generating projects.
 * @param name
 */
 function generateProject(name) {
  if (listProjects().indexOf(name) >= 0) {
    var generator = require('./generator');
    var project = generator.createProject(name);
    generator.currentProject = project;
    project.setProjectName(name);
    gulp.start(project.projectType);
  } else {
    console.error('There are no projects with name', name);
    console.log('The available projects are', projects);
  }
}

/**
 * The tools absolute template folder path for config files, ide settings etc...
 * @return {*|string}
 */
function commonTemplatesPath() {
  return path.join(__dirname, 'templates');
}

/**
 * Using the defaultGlobalConfig() and template generate the global .angularity config file.
 * @param override template context
 */
 function createAngularityGlobalConfig(override) {
  var configTemplatePath = path.join(commonTemplatesPath(), '.angularity');
  var configTemplate = fs.readFileSync(configTemplatePath, 'utf8');
  var defaultContext = configDefaults.globalConfig;

  if (typeof override !== 'undefined') {
    defaultContext = merge(defaultContext, override);
  }

  var configFileContent;
  try {
    configFileContent = template(configTemplate, defaultContext)
  } catch (error) {
// @implaler - what is to be achieved here?
    console.error('createAngularityGlobalConfig()');
    throw error;
  }
  fs.writeFileSync(path.join(ideTemplate.HOME(), '.angularity'), configFileContent, 'utf8');
}

/**
 * Using the createAngularityProjectConfig() and template generate a project specific angularity.json config file.
 * @param destination
 * @param override
 */
 function createAngularityProjectConfig(destination, override) {
  var configTemplatePath = path.join(commonTemplatesPath(), 'angularity.json');
  var configTemplate = fs.readFileSync(configTemplatePath, 'utf8');
  var defaultContext = configDefaults.projectConfig;

  if (typeof override !== 'undefined') {
    defaultContext = merge(defaultContext, override);
  }

  var configFileContent;

  try {
    configFileContent = template(configTemplate, defaultContext)
  } catch (error) {
    console.error('createAngularityProjectConfig()');
    throw error;
  }

  var configFileDestination = path.join(destination, 'angularity.json');
  fs.writeFileSync(configFileDestination, configFileContent, 'utf8');
}

/**
 * Basic check on a folder path if a generator project exists.
 * @param projectPath
 * @returns {*}
 */
 function validateGeneratorProject(projectPath) {
  return fs.existsSync(path.join(projectPath, 'index.js'));
};

/**
 * List all the generator projects in the local ./lib/generator/projects folder.
 * @returns {Array}
 */
function listProjects() {
  return fs.readdirSync(String(projectsPath))
    .filter(function (project) {
      return (validateGeneratorProject(path.join(__dirname, 'projects', project)));
    });
};

/**
 * Copy a directory recursively to a given destination.
 * @param source
 * @param destination
 * @param copyRootFolder {Boolean} if true do not copy the root folder of the source path,
 *                           instead just copy it's contents.
 */
function cpR(source, destination, copyRootFolder) {
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
}

/**
 * Basic npm install command to run the install programatically,
 * the current working directory of process will be unaltered.
 * @param destination
 */
 function npmInstall(destination) {
  var originalCWD = process.cwd();
  cd(destination);
  var npmInstallCode = exec('npm i').code;
  if (npmInstallCode > 0) {
    process.exit(npmInstallCode);
  }
  cd(String(originalCWD));
}

/**
 * Shortcut to check if a directory has an Angularity project at a specific directory.
 * Basic check only looks for the config file and some required folders.
 * @param directory
 * @returns {*}
 */
function validateExistingProject(directory) {
  function validateProjectDirectories(directory) {
    return ['css-lib', 'js-lib', 'target'].every(function(subdirectory) {
      return fs.existsSync(path.join(directory, 'src', subdirectory));
    });
  }
  function validateConfigExists(directory) {
    return fs.existsSync(path.join(directory, 'angularity.json'));
  }
  return validateProjectDirectories(directory) && validateConfigExists(directory);
}

/**
 * Require all the generator projects in the `./lib/generator/projects` folder.
 * This is used to populate the cli menu with the projects to generate.
 */
function requireProjects() {
  listProjects();
  projects.forEach(function (project) {
    var pathResolved = path.resolve(__dirname, '.' + path.sep, path.join('projects', project, 'index'));
    require(pathResolved);
  });
}

/**
 * The main Generator Project template.
 * @param type
 * @constructor
 */
function GeneratorProject(type) {
  var projectTypePath    = path.join(__dirname, 'projects', type);
  var defaultProjectName = 'angularity-project';
  if (!fs.existsSync(projectTypePath)) {
    throw new Error('There does not seem to be a project with the name: ' + type);
  }

  /**
   * The project type is the folder name of the generator project.
   * Eg: es5-minimal
   */
  this.projectType = type;

  /**
   * The absolute path to the generator project template.
   */
  this.projectTypePath = projectTypePath;

  /**
   * The project name used by the generator to populate the config files, destination etc.
   */
  this.projectName = defaultProjectName;

  /**
   * The absolute path the the generator project's template folder.
   */
  this.templatePath = path.join(__dirname, 'projects', type, 'template');

  /**
   * The generator project's destination path.
   */
  this.destination = path.join(String(process.cwd()), defaultProjectName);

  // TODO block comment
  this.projectConfig = configDefaults.projectConfig;

  /**
   * Set the main project name and update the destination path.
   * @param name
   */
  this.setProjectName = function (name) {
    this.projectName = name;
    this.destination = path.join(String(process.cwd()), name);
  };

  /**
   * Based on the current GeneratorProject object,
   * recursively copy all the project's files to the project's destination.
   */
  this.copyProjectTemplateFiles = function () {
    cpR(this.templatePath, this.destination, true);
  };

  /**
   * Based on the current GeneratorProject object,
   * create an Angularity Project Config and determine the destination automatically.
   * @param override
   */
  this.createAngularityProjectConfig = function (override) {
    if (typeof override !== 'undefined') {
      this.projectConfig = merge(this.projectConfig, override);
    }
    createAngularityProjectConfig(this.destination, this.projectConfig);
  };
}

GeneratorProject.factory = function (type) {
  return new GeneratorProject(type);
}

module.exports = {
  createProject  : GeneratorProject.factory,
  currentProject : null,
  requireProjects: requireProjects,
  util           : {
    generateProject              : generateProject,
    commonTemplatesPath          : commonTemplatesPath,
    createAngularityGlobalConfig : createAngularityGlobalConfig,
    createAngularityProjectConfig: createAngularityProjectConfig,
    validateGeneratorProject     : validateGeneratorProject,
    listProjects                 : listProjects,
    cpR                          : cpR,
    npmInstall                   : npmInstall,
    validateExistingProject      : validateExistingProject
  }
};
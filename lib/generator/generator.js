'use strict';
/* globals cd, cp, mkdir, exec */

var fs          = require('fs'),
    path        = require('path'),
    ideTemplate = require('ide-template'),
    _           = require('lodash');

var config = require('../config');

require('shelljs/global');

var projects = [];
var util = {};

util.defaultConfig = function () {
  return {
    serverHttpPort        : Math.floor(Math.random() * 9000) + 1000,
    javascriptVersion     : config.ES5,
    webstormExecutablePath: 'wstorm', //todo ide-template provided path
    consoleWidth          : 80,
    minify                : false
  };
};

util.defaultProjectConfig = function () {
  var config = require('../config');
  return {
    name                  : 'angularity-project',//todo
    version               : '0.0.1',
    angularityVersion     : '0.0.1',//todo
    serverHttpPort        : config.serverHttpPort(),
    javascriptVersion     : config.javascriptVersion(),
    consoleWidth          : config.consoleWidth(),
    webstormExecutablePath: config.webstormExecutablePath()
  };
};

util.commonTemplatesPath = path.join(__dirname, 'templates');

util.createAngularityConfig = function (override) {
  var configTemplatePath = path.join(util.commonTemplatesPath, '.angularity');
  var configTemplate = fs.readFileSync(configTemplatePath);
  var context = util.defaultConfig();

  if (typeof override !== 'undefined') {
    context = _.merge(util.defaultConfig, override);
  }

  var configFileContent = _.template(configTemplate, context);
  fs.writeFileSync(path.join(ideTemplate.HOME(), '.angularity'), configFileContent, 'utf8');
};

util.validProject = function (projectPath) {
  return fs.existsSync(path.join(projectPath, 'index.js'));
};

util.listProjects = function () {
  var projectsPath = path.join(__dirname, 'projects');
  var existingProjects = [];
  var projectsDirectory = fs.readdirSync(String(projectsPath));

  _.forEach(projectsDirectory, function (project) {
    if (util.validProject(path.join(projectsPath, project))) {
      existingProjects.push(project);
    }
  });

  projects = existingProjects;
  return projects;
};

/**
 * Copy a directory recursively to a given destination.
 *
 * @param source
 * @param destination
 * @param contents {Boolean} if true do not copy the root folder of the source path,
 *                           instead just copy it's contents.
 */
util.cpR = function (source, destination, contents)
{
  contents = contents || false;

  if (!fs.existsSync(destination)) {
    mkdir('-p', destination);
  }

  if (contents) {
    var originalCWD = process.cwd();
    cd(source);
    cp('-R', '.', destination);
    cd(String(originalCWD));
  } else {
    cp('-R', source, destination);
  }
};

util.npmInstall = function (destination) {
  var originalCWD = process.cwd();
  cd(destination);

  var npmInstallCode = exec('npm i').code;

  if (npmInstallCode > 0) {
    process.exit(npmInstallCode);
  }

  cd(String(originalCWD));
};

function GeneratorProject(type) {
    var projectTypePath = path.join(__dirname, 'projects', type);
    var defaultProjectName = 'angularity-project';

    if (!fs.existsSync(projectTypePath)) {
        console.error('Error there does not seem to be a project with the name', type);
    }

    return {
        projectType        : type,
        projectName        : defaultProjectName,
        projectTypePath    : projectTypePath,
        templatePath       : path.join(__dirname, 'projects', type, 'template'),
        destination        : path.join(String(process.cwd()), defaultProjectName),

        setProjectName: function(name) {
            this.projectName = name;
            this.destination = path.join(String(process.cwd()), name);
        },

        copyProjectTemplateFiles: function () {
            util.cpR(this.templatePath, this.destination, true);
        },

        createJSHint: function () {
            var hintFolder = path.join(util.commonTemplatesPath, '.jshintrc');
            cp(hintFolder, this.destination);
        },

        createAngularityProjectConfig: function (override) {
            //todo angularity@1.0.1
            var configTemplatePath = path.join(util.commonTemplatesPath, 'angularity.json');
            var configTemplate = fs.readFileSync(configTemplatePath);
            var context = util.defaultProjectConfig();

            if (typeof override !== 'undefined') {
                context = _.merge(context, override);
            }

            var configFileContent = _.template(configTemplate, context);
            fs.writeFileSync(path.join(this.destination, 'angularity.json'), configFileContent, 'utf8');
        }
    };
}

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
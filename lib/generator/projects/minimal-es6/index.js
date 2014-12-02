/**
 * A minimal project for Angularity ES5 projects.
 * Includes the generation of a WebStorm project with a debugger profile,
 * resource roots and type definition libraries configured.
 */
'use strict';

var gulp         = require('gulp'),
    fs           = require('fs'),
    generator    = require('../../generator'),
    config       = require('../../../config/config'),
    configValues = require('../../../config/configDefaults'),
    _            = require('lodash'),
    webStorm     = require('ide-template').webStorm;

gulp.task('minimal-es6', function ()
{
  var project = generator.currentProject;

  project.copyProjectTemplateFiles();
  project.createAngularityProjectConfig({javascriptVersion: configValues.compileTargets.ES6});

  generator.util.npmInstall(project.destination);
  webStorm.createProject(project.destination, projectContext(project));
  webStorm.open(project.destination);
});

function projectContext(project) {
  // Adjust a preset project pane node to have the project tree open at src.
  var projectPane = fs.readFileSync(__dirname + '/projectPane.xml');
  projectPane = _.template(projectPane, {rootPath: project.projectName});

  return {
    projectName           : project.projectName,
    jshintPath            : '$PROJECT_DIR$/.jshintrc',
    jsDebugPort           : project.projectConfig.serverHttpPort,
    javascriptVersion     : configValues.compileTargets.ES6,
    watcherSuppressedTasks: 'Traceur compiler',
    contentPaths          : [
      {
        content: 'file://' + project.destination
      }
    ],
    libraries             : ['jasmine-DefinitelyTyped', 'angular'],
    selectedDebugName     : 'JavaScript Debug.' + project.projectName,
    jsDebugConfiguration  : [
      {
        name   : project.projectName,
        uri    : 'http://localhost:' + project.projectConfig.serverHttpPort + '/app',
        mapping: {
          url      : 'http://localhost:' + config.serverHttpPort(),
          localFile: '$PROJECT_DIR$'
        }
      }
    ],
    plainText             : [
      'file://$PROJECT_DIR$/build/app/main.css',
      'file://$PROJECT_DIR$/build/app/main.js'
    ],
    resourceRoots         : [
      'file://$PROJECT_DIR$/src/js-lib',
      'file://$PROJECT_DIR$/src/css-lib',
      'file://$PROJECT_DIR$/src/target'
    ],
    projectPane           : projectPane
  };
}
'use strict';
var gulp        = require('gulp'),
    fs          = require('fs'),
    _           = require('lodash'),
    generator   = require('../../generator'),
    config      = require('../../../config'),
    ideTemplate = require('ide-template');

gulp.task('minimal-es5', function ()
{
  var project = generator.currentProject;
  var webStorm = ideTemplate.webStorm;

  project.copyProjectTemplateFiles();
  project.createAngularityProjectConfig();
  project.createJSHint();

  generator.util.npmInstall(project.destination);
  webStorm.createProject(project.destination, projectContext(project));
  webStorm.open(project.destination);
});

function projectContext(project) {
  return {
    projectName         : project.projectName,
    jshintPath          : '$PROJECT_DIR$/.jshintrc',
    jsDebugPort         : config.serverHttpPort(),
    contentPaths        : [
      {
        content: 'file://' + project.destination
      }
    ],
    libraries           : ['jasmine-DefinitelyTyped', 'angular'],
    selectedDebugName   : 'JavaScript Debug.' + project.projectName,
    jsDebugConfiguration: [
      {
        name   : project.projectName,
        uri    : 'http://localhost:' + config.serverHttpPort() + '/app',
        mapping: {
          url      : 'http://localhost:' + config.serverHttpPort(),
          localFile: '$PROJECT_DIR$'
        }
      }
    ],
    plainText           : [
      'file://$PROJECT_DIR$/build/app/main.css',
      'file://$PROJECT_DIR$/build/app/main.js'
    ],
    resourceRoots       : [
      'file://$PROJECT_DIR$/src/js-lib',
      'file://$PROJECT_DIR$/src/css-lib',
      'file://$PROJECT_DIR$/src/target'
    ],
    projectPane         : fs.readFileSync(__dirname + '/projectPane.xml')
  };
}
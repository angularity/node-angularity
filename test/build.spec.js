'use strict';

var fs = require('fs');
var path = require('path');
var AsyncSpec = require('node-jasmine-async');

require('shelljs/global');

var helper = require('./helpers/helper');
var testPath = path.join(__dirname, 'test-temp');

describe('Running the build task on an angularity project.', function () {
  var projectName = 'angularity-project-es5';
  var projectTemplatePath = path.join(__dirname, 'test-projects', projectName);
  var projectTempPath = path.join(testPath, projectName);

  beforeEach(function () {
    mkdir('-p', projectTempPath);
    cp('-r', projectTemplatePath, testPath);
  });

  afterEach(function () {
    rm('-rf', testPath);
  });

  it('should bundle the javascript to a main.js in the build directory.', function (done) {
    var angularity = helper.runAngularity(['build'], projectTempPath);

    angularity.on('close', function (code) {
      expect(fs.existsSync(path.join(projectTempPath, 'build', 'app', 'main.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectTempPath, 'build', 'app', 'main.js.map'))).toBe(true);

      var mainJSExpectedContent = fs.readFileSync(path.join(projectTemplatePath, 'build', 'app', 'main.js'), 'utf8');
      var mainJSBuiltContent = fs.readFileSync(path.join(projectTempPath, 'build', 'app', 'main.js'), 'utf8');

      expect(mainJSBuiltContent).toEqual(mainJSExpectedContent);

      angularity.stdin.end();
      done();
    });
  });

  it('should trans-compile the scss to main.css in the build directory.', function (done) {
    var angularity = helper.runAngularity(['build'], projectTempPath);

    angularity.on('close', function (code) {
      expect(fs.existsSync(path.join(projectTempPath, 'build', 'app', 'main.css'))).toBe(true);
      expect(fs.existsSync(path.join(projectTempPath, 'build', 'app', 'main.css.map'))).toBe(true);

      angularity.stdin.end();
      done();
    });
  });

  it('should create a template cache javascript bundle.', function (done) {
    var angularity = helper.runAngularity(['build'], projectTempPath);

    angularity.on('close', function (code) {
      expect(fs.existsSync(path.join(projectTempPath, 'build', 'templates.html.js'))).toBe(true);

      angularity.stdin.end();
      done();
    });
  });

});

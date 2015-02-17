'use strict';

var fs     = require('fs'),
    rimraf = require('rimraf'),
    path   = require('path');

var helper = require('../helpers/helper');
var cp = require('shelljs').cp;

describe('The Angularity build task should correctly build an existing project.', function () {

  var expectedBuildFolder;
  var buildFolder;

  beforeEach(function () {
    this.addMatchers(require('jasmine-diff-matchers').diffPatch);
  });

  afterEach(function () {
    helper.cleanTestTemp();
  });

  beforeEach(function () {
    expectedBuildFolder = helper.expectedFolder('minimal-es5');
    buildFolder = helper.resolveTestTempPath('minimal-es5-temp');

    cp('-Rf', expectedBuildFolder + '/*', buildFolder);
    rimraf.sync(path.join(buildFolder, 'app-build'));
    process.chdir(buildFolder);
  });

  it('should successfully build the minimal-es5 project\'s js.', function (done) {
    helper.runAngularity('build')
      .then(function (result) {
        var expectedJSBundle = path.join(expectedBuildFolder, 'app-build', 'index.js');
        var builtJSBundle = path.join(buildFolder, 'app-build', 'index.js');
        expect(builtJSBundle).diffFilePatch(expectedJSBundle);

        done();
      });
  });

  it('should successfully build the minimal-es5 project\'s css.', function (done) {
    helper.runAngularity('build')
      .then(function (result) {
        var expectedCSS = path.join(expectedBuildFolder, 'app-build', 'index.css');
        var buildCSS = path.join(buildFolder, 'app-build', 'index.css');
        expect(buildCSS).diffFilePatch(expectedCSS);

        done();
      });
  });

});

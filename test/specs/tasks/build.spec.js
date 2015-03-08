'use strict';
var path = require('path');

var helper = require('../../helpers/helper');
var expectedBuildFolder = helper.expectedFolder('minimal-es5');
var buildFolder = helper.resolveTestTempPath('minimal-es5-build');
var buildName = 'app-build';

describe('The Angularity build task should correctly build an existing project.', function () {
  beforeEach(function (done) {
    this.addMatchers(require('jasmine-diff-matchers').diffPatch);
    helper.prepareExpectedDir(done, buildFolder, buildName, expectedBuildFolder);
  });

  it('should successfully build the minimal-es5 project\'s js.', function (done) {
    helper.runAngularity('build', {cwd: buildFolder})
      .then(function () {
        var expectedJSBundle = path.join(expectedBuildFolder, buildName, 'index.js');
        var builtJSBundle = path.join(buildFolder, buildName, 'index.js');
        expect(builtJSBundle).diffFilePatch(expectedJSBundle);

        done();
      });
  });

  it('should successfully build the minimal-es5 project\'s css.', function (done) {
    helper.runAngularity('build', {cwd: buildFolder})
      .then(function () {
        var expectedCSS = path.join(expectedBuildFolder, buildName, 'index.css');
        var buildCSS = path.join(buildFolder, buildName, 'index.css');
        expect(buildCSS).diffFilePatch(expectedCSS);

        done();
      });
  });
});
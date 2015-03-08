'use strict';
var path   = require('path');

var helper = require('../../helpers/helper');
var expectedBuildFolder = helper.expectedFolder('minimal-es5');
var buildFolder = helper.resolveTestTempPath('minimal-es5-test');
var buildName = 'app-test';

describe('The Angularity build task should correctly build the test specs for an existing project.', function () {
  beforeEach(function (done) {
    this.addMatchers(require('jasmine-diff-matchers').diffPatch);
    helper.prepareExpectedDir(done, buildFolder, buildName, expectedBuildFolder);
  });

  it('should successfully build the minimal-es5 project\'s spec files.', function (done) {
    helper.runAngularity('build', {cwd: buildFolder})
      .then(function () {
        var expectedJSBundle = path.join(expectedBuildFolder, buildName, 'index.js');
        var builtJSBundle = path.join(buildFolder, buildName, 'index.js');
        expect(builtJSBundle).diffFilePatch(expectedJSBundle);

        done();
      });
  });

});

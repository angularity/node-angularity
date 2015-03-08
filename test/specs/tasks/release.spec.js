'use strict';
var path   = require('path');

var helper = require('../../helpers/helper');
var expectedBuildFolder = helper.expectedFolder('minimal-es5');
var buildFolder = helper.resolveTestTempPath('minimal-es5-release');
var buildName = 'app-release';

describe('The Angularity release task should correctly build a release version.', function () {
  beforeEach(function (done) {
    this.addMatchers(require('jasmine-diff-matchers').diffPatch);
    helper.prepareExpectedDir(done, buildFolder, buildName, expectedBuildFolder);
  });

  it('should successfully release the minimal-es5 project\'s js.', function (done) {
    helper.runAngularity('release', {cwd : buildFolder})
      .then(function () {
        var expectedJSBundle = path.join(expectedBuildFolder, buildName, 'index.js');
        var builtJSBundle = path.join(buildFolder, buildName, 'index.js');
        expect(builtJSBundle).diffFilePatch(expectedJSBundle);

        done();
      });
  });

  it('should successfully release the minimal-es5 project\'s css.', function (done) {
    helper.runAngularity('release', {cwd : buildFolder})
      .then(function () {
        var expectedCSS = path.join(expectedBuildFolder, buildName, 'index.css');
        var buildCSS = path.join(buildFolder, buildName, 'index.css');
        expect(buildCSS).diffFilePatch(expectedCSS);

        done();
      });
  });

  it('should successfully release the minimal-es5 project\'s vendor files.', function (done) {
    var expectedVendorFolder = path.join(expectedBuildFolder, buildName, 'vendor');
    var buildVendorFolder = path.join(buildFolder, buildName, 'vendor');

    helper.runAngularity('release', {cwd : buildFolder})
      .then(function () {
        var expectedManifest = path.join(expectedVendorFolder, 'manifest.json');
        var buildManifest = path.join(buildVendorFolder, 'manifest.json');
        expect(buildManifest).diffFilePatch(expectedManifest);

        var expectedAngular = path.join(expectedVendorFolder, 'angular', 'angular.js');
        var buildAngular = path.join(buildVendorFolder, 'angular', 'angular.js');
        expect(buildAngular).diffFilePatch(expectedAngular);

        var expectedAngularUIRouter = path.join(expectedVendorFolder, 'angular-ui-router', 'angular-ui-router.js');
        var buildAngularUIRouter = path.join(buildVendorFolder, 'angular-ui-router', 'angular-ui-router.js');
        expect(expectedAngularUIRouter).diffFilePatch(buildAngularUIRouter);

        done();
      });
  });

});

'use strict';

var fs     = require('fs'),
    rimraf = require('rimraf'),
    path   = require('path');

var helper = require('../helpers/helper');
var cp = require('shelljs').cp;

describe('The Angularity release task should correctly build a release version.', function () {

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
    buildFolder = helper.resolveTestTempPath('minimal-es5-release-temp');

    cp('-Rf', expectedBuildFolder + '/*', buildFolder);
    rimraf.sync(path.join(buildFolder, 'app-build'));
    rimraf.sync(path.join(buildFolder, 'app-release'));
    process.chdir(buildFolder);
  });

  it('should successfully release the minimal-es5 project\'s js.', function (done) {
    helper.runAngularity('release')
      .then(function (result) {
        var expectedJSBundle = path.join(expectedBuildFolder, 'app-release', 'index.js');
        var builtJSBundle = path.join(buildFolder, 'app-release', 'index.js');
        expect(builtJSBundle).diffFilePatch(expectedJSBundle);

        done();
      });
  });

  it('should successfully release the minimal-es5 project\'s css.', function (done) {
    helper.runAngularity('release')
      .then(function (result) {
        var expectedCSS = path.join(expectedBuildFolder, 'app-release', 'index.css');
        var buildCSS = path.join(buildFolder, 'app-release', 'index.css');
        expect(buildCSS).diffFilePatch(expectedCSS);

        done();
      });
  });

  it('should successfully release the minimal-es5 project\'s vendor files.', function (done) {
    var expectedVendorFolder = path.join(expectedBuildFolder, 'app-release', 'vendor');
    var buildVendorFolder = path.join(buildFolder, 'app-release', 'vendor');

    helper.runAngularity('release')
      .then(function (result) {

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

'use strict';

var fs = require('fs');
var path = require('path');

require('shelljs/global');

var helper = require('./helpers/helper');
var testPath = path.join(__dirname, 'test-temp');

describe('The Angularity global install provides a cli interface.', function () {

  it('should return no error when the global command is run.', function (done) {
    helper.runAngularity()
      .then(function (result) {
        expect(result.code).toEqual(0);
        done();
      });
  });

  it('should show the correct version number on the -v argument.', function (done) {
    var packagePath = path.resolve(__dirname, '..', 'package.json');
    var version = require(packagePath).version;

    helper.runAngularityAlias(['-v', '--version'])
      .then(function (results) {
        results.forEach(function (result) {
          expect(result.stdout).toBe('angularity: ' + version + '\n');
          expect(result.code).toEqual(0);
        });
        done();
      });
  });

  it('should correctly display a help menu with the --help argument.', function (done) {
    helper.runAngularityAlias(['-h', '--help'])
      .then(function (results) {
        results.forEach(function (result) {
          expect(result.stderr).toMatch(/Angularity is an opinionated build tool for AngularJS projects/);
          expect(result.stderr).toMatch(/Examples:/);
          expect(result.stderr).toMatch(/Options:/);
        });
        done();
      });
  });
});

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
    helper.runAngularity(['-v'])
      .then(function (result) {
        var packagePath = path.resolve(__dirname, '..', 'package.json');
        var version = require(packagePath).version;

        expect(result.stdout).toBe('angularity: ' + version + '\n');
        expect(result.code).toBe(0);
        done();
      });
  });
});

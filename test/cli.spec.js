'use strict';

var fs = require('fs');
var path = require('path');

require('shelljs/global');

var helper = require('./helpers/helper');

var testPath = path.join(__dirname, 'test-temp');

describe('The Angularity global install provides a cli interface.', function () {

  it('should return no error when the global command is run.', function (done) {
    var angularity = helper.runAngularity(['-v']);

    var stdout = '';
    angularity.stdout.on('data', function (data) {
      stdout += data;
    });

    angularity.on('close', function (code) {
      console.log('stdout', stdout);

      expect(code).toBe(0);
      done();
    });
  });

  it("should display the expected cli main menu items", function (done) {
    var stdout = '';
    var angularity = helper.runAngularity();

    angularity.stdout.on('data', function (data) {
      stdout += data;
    });

    setTimeout(function () {
      expect(stdout).toMatch(/Welcome to Angularity/g);
      expect(stdout).toMatch(/No project was found in your current working directory/g);
      expect(stdout).toMatch(/Generate Project/g);
      expect(stdout).toMatch(/Install WebStorm Tools/g);

      angularity.stdin.end();
      done();
    }, 5000);

  });

});

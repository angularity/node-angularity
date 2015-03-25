'use strict';

var path = require('path');

var helper = require('../helpers/angularity-test');

var fastIt = helper.jasmineFactory({
  before: 0,
  after : 500
});

describe('The Angularity cli interface', function () {

  beforeEach(helper.getTimeoutSwitch(90000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('should exit cleanly where there are no other arguments', function (done) {
    helper.runner.create()
      .addInvocation()
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect(testCase.exitcode).toBeFalsy();
      expect(testCase.stdout).toMatch(/\s*/);
      expect(testCase.stderr).toMatch(/\s*/);
    }
  });

  describe('for help', function () {
    describe('should display help where requested', function (done) {
      helper.runner.create()
        .addInvocation('help')
        .addInvocation('--help')
        .addInvocation('-h')
        .forEach(fastIt(expectations))
        .finally(done);
    });

    describe('should display help when task not recognised', function (done) {
      helper.runner.create()
        .addInvocation('illegal')
        .forEach(fastIt(expectations))
        .finally(done);
    });

    function expectations(testCase) {
      // test the help message begins with the description from the package.json
      var description = require(path.resolve('package.json')).description;
      expect(testCase.stderr).toMatch(new RegExp('^\\s*' + description));
    }
  });

  describe('should display version where requested', function (done) {
    helper.runner.create()
      .addInvocation('--version')
      .addInvocation('-v')
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      var version = require(path.resolve('package.json')).version;
      expect(testCase.stdout).toMatch(new RegExp('^angularity\\:\\s*' + version));
    }
  });
});

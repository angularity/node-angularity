'use strict';

var path = require('path');

var helper = require('../helpers/angularity-test');

var fastIt = helper.jasmineFactory({
  before: 0,
  after : 500
});

describe('The Angularity cli interface', function () {

  beforeEach(helper.getTimeoutSwitch(30000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('with no other arguments', function (done) {
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

  describe('with version switch', function (done) {
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

  describe('with help switch', function (done) {
    helper.runner.create()
      .addInvocation('--help')
      .addInvocation('-h')
//    .addInvocation('-?')  // TODO @bholloway process cannot be spawned on windows when it has -? flag
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      // test the help message begins with the description from the package.json
      var description = require(path.resolve('package.json')).description;
      expect(testCase.stderr).toMatch(new RegExp('^\\s*' + description));
    }
  });
});
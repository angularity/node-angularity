'use strict';

var path = require('path');

var helper = require('../helpers/angularity-test');

describe('The Angularity cli interface', function () {

  afterEach(helper.cleanUp);

  describe('with no other arguments', function (done) {
    helper.runner.create()
      .addInvocation()
      .forEach(helper.getJasmineForRunner(expectations))
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
      .forEach(helper.getJasmineForRunner(expectations))
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
      .addInvocation('-?')
      .forEach(helper.getJasmineForRunner(expectations))
      .finally(done);

    function expectations(testCase) {
      var description = require(path.resolve('package.json')).description;
      expect(testCase.stderr).toMatch(new RegExp('^\\s*' + description));
    }
  });
});
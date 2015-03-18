'use strict';

var helper         = require('../../helpers/angularity-test'),
    matchers       = require('../../helpers/jasmine-matchers'),
    javascriptSpec = require('./javascript.spec');

var fastIt = helper.jasmineFactory({
  before: 0,
  after : 500
});

var slowIt = helper.jasmineFactory({
  before: 500,
  after : 1000
});

var BUILD_FOLDER = 'app-build';
var TEST_FOLDER  = 'app-test';

describe('The Angularity test task', function () {

  beforeEach(matchers.addMatchers);

  beforeEach(javascriptSpec.customMatchers);

  beforeEach(customMatchers);

  beforeEach(helper.getTimeoutSwitch(60000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('should display help when requested', function (done) {
    helper.runner.create()
      .addInvocation('test --help')
      .addInvocation('test -h')
      //    .addInvocation('test -?')  // TODO @bholloway process cannot be spawned on windows when it has -? flag
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect([testCase.cwd, BUILD_FOLDER]).toBeEmptyDirectory();
      expect([testCase.cwd, TEST_FOLDER ]).toBeEmptyDirectory();
      expect(testCase.stderr).toBeHelpWithError(false);
    }
  });

  describe('should build unminified javascript and run tests', function(done) {
    helper.runner.create()
      .addSource('minimal-es5')
      .addInvocation('test')
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect(testCase.stdout).toBeTask('test');
      expect(testCase.stdout).toMatch(/^Karma tests\:\s+1\/1$/m);
      javascriptSpec.expectations(testCase);
console.log(test);
    }
  });

  describe('should not support unminified option', function(done) {
    helper.runner.create()
      .addSource('minimal-es5-unminified')
      .addInvocation('test --unminified')
      .addInvocation('test -u')
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect(testCase.stderr).toBeHelpWithError(true);
    }
  });
});

function customMatchers() {
  jasmine.addMatchers({
    toBeHelpWithError: matchers.getHelpMatcher(/^\s*The "test" task/)
  });
}
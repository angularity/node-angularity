'use strict';

var helper    = require('../../helpers/angularity-test'),
    buildSpec = require('./build.spec')

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

  describe('should build minified (by default)', function(done) {
    helper.runner.create()
      .addSource('minimal-es5')
      .addInvocation('test')
      .addInvocation('test --unminified false')
      .addInvocation('test -u false')
      .forEach(slowIt(expectations))
      .finally(done);
  });

  describe('should build unminified', function(done) {
    helper.runner.create()
      .addSource('minimal-es5-unminified')
      .addInvocation('test --unminified')
      .addInvocation('test -u')
      .addInvocation('test --unminified true')
      .addInvocation('test -u true')
      .forEach(slowIt(expectations))
      .finally(done);
  });
});

function expectations(testCase) {
  expect(testCase.stdout).toBeTask('test');
  buildSpec.expectations(testCase);
}
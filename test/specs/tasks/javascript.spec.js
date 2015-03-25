'use strict';

var helper         = require('../../helpers/angularity-test'),
    matchers       = require('../../helpers/jasmine-matchers'),
    javascriptTask = require('./javascript-task');

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

describe('The Angularity javascript task', function () {

  beforeEach(matchers.addMatchers);

  beforeEach(javascriptTask.customMatchers);

  beforeEach(helper.getTimeoutSwitch(90000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('should display help when requested', function (done) {
    helper.runner.create()
      .addInvocation('javascript --help')
      .addInvocation('javascript -h')
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect([testCase.cwd, BUILD_FOLDER]).toBeEmptyDirectory();
      expect([testCase.cwd, TEST_FOLDER ]).toBeEmptyDirectory();
      expect(testCase.stderr).toBeJsHelpWithError(false);
    }
  });

  describe('should operate minified (by default)', function(done) {
    helper.runner.create()
      .addSource('angularity-helloworld-es5')
      .addParameters({ subdir: 'app-minified' })
      .addInvocation('javascript')
      .addInvocation('javascript --unminified false')
      .addInvocation('javascript -u false')
      .forEach(slowIt(javascriptTask.expectations))
      .finally(done);
  });

  describe('should operate unminified', function(done) {
    helper.runner.create()
      .addSource('angularity-helloworld-es5')
      .addParameters({ subdir: 'app-unminified' })
      .addInvocation('javascript --unminified')
      .addInvocation('javascript -u')
      .addInvocation('javascript --unminified true')
      .addInvocation('javascript -u true')
      .forEach(slowIt(javascriptTask.expectations))
      .finally(done);
  });
});
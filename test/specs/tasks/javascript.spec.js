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

xdescribe('The Angularity javascript task', function () {

  beforeEach(matchers.addMatchers);

  beforeEach(javascriptTask.customMatchers);

  beforeEach(helper.getTimeoutSwitch(60000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  xdescribe('should display help when requested', function (done) {
    helper.runner.create()
      .addInvocation('javascript --help')
      .addInvocation('javascript -h')
//    .addInvocation('javascript -?')  // TODO @bholloway process cannot be spawned on windows when it has -? flag
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect([testCase.cwd, BUILD_FOLDER]).toBeEmptyDirectory();
      expect([testCase.cwd, TEST_FOLDER ]).toBeEmptyDirectory();
      expect(testCase.stderr).toBeJsHelpWithError(false);
    }
  });

  xdescribe('should operate minified (by default)', function(done) {
    helper.runner.create()
      .addSource('minimal-es5')
      .addInvocation('javascript')
      .addInvocation('javascript --unminified false')
      .addInvocation('javascript -u false')
      .forEach(slowIt(javascriptTask.expectations))
      .finally(done);
  });

  xdescribe('should operate unminified', function(done) {
    helper.runner.create()
      .addSource('minimal-es5-unminified')
      .addInvocation('javascript --unminified')
      .addInvocation('javascript -u')
      .addInvocation('javascript --unminified true')
      .addInvocation('javascript -u true')
      .forEach(slowIt(javascriptTask.expectations))
      .finally(done);
  });
});
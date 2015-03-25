'use strict';

var helper    = require('../../helpers/angularity-test'),
    matchers  = require('../../helpers/jasmine-matchers'),
    buildTask = require('./build-task');

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

describe('The Angularity build task', function () {

  beforeEach(matchers.addMatchers);

  beforeEach(buildTask.customMatchers);

  beforeEach(helper.getTimeoutSwitch(90000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('should display help when requested', function (done) {
    helper.runner.create()
      .addInvocation('build --help')
      .addInvocation('build -h')
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect([testCase.cwd, BUILD_FOLDER]).toBeEmptyDirectory();
      expect([testCase.cwd, TEST_FOLDER ]).toBeEmptyDirectory();
      expect(testCase.stderr).toBeBuildHelpWithError(false);
    }
  });

  describe('full test with small application', function() {
    describe('should operate minified (by default)', function(done) {
      helper.runner.create()
        .addSource('angularity-helloworld-es5')
        .addParameters({ subdir: 'app-minified' })
        .addInvocation('build')
        .addInvocation('build --unminified false')
        .addInvocation('build -u false')
        .forEach(slowIt(buildTask.expectations))
        .finally(done);
    });

    describe('should operate unminified', function(done) {
      helper.runner.create()
        .addSource('angularity-helloworld-es5')
        .addParameters({ subdir: 'app-unminified' })
        .addInvocation('build --unminified')
        .addInvocation('build -u')
        .addInvocation('build --unminified true')
        .addInvocation('build -u true')
        .forEach(slowIt(buildTask.expectations))
        .finally(done);
    });
  });

  describe('smoke test with larger application', function() {
    describe('should operate minified (by default)', function (done) {
      helper.runner.create()
        .addSource('angularity-todo-es5')
        .addParameters({subdir: 'app-minified'})
        .addInvocation('build')
        .forEach(slowIt(buildTask.expectations))
        .finally(done);
    });

    describe('should operate unminified', function (done) {
      helper.runner.create()
        .addSource('angularity-todo-es5')
        .addParameters({subdir: 'app-unminified'})
        .addInvocation('build -u')
        .forEach(slowIt(buildTask.expectations))
        .finally(done);
    });
  });
});
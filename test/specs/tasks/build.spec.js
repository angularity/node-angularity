'use strict';

var diffMatchers = require('jasmine-diff-matchers');

var helper         = require('../../helpers/angularity-test'),
    matchers       = require('../../helpers/jasmine-matchers'),
    javascriptSpec = require('./javascript.spec.js'),
    cssSpec        = require('./css.spec.js');

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

  beforeEach(javascriptSpec.customMatchers);

  beforeEach(cssSpec.customMatchers);

  beforeEach(customMatchers);

  beforeEach(helper.getTimeoutSwitch(60000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('should display help when requested', function (done) {
    helper.runner.create()
      .addInvocation('build --help')
      .addInvocation('build -h')
//    .addInvocation('build -?')  // TODO @bholloway process cannot be spawned on windows when it has -? flag
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect([testCase.cwd, BUILD_FOLDER]).toBeEmptyDirectory();
      expect([testCase.cwd, TEST_FOLDER ]).toBeEmptyDirectory();
      expect(testCase.stderr).toBeBuildHelpWithError(false);
    }
  });

  describe('should operate minified (by default)', function(done) {
    helper.runner.create()
      .addSource('minimal-es5')
      .addInvocation('build')
      .addInvocation('build --unminified false')
      .addInvocation('build -u false')
      .forEach(slowIt(expectations))
      .finally(done);
  });

  describe('should operate unminified', function(done) {
    helper.runner.create()
      .addSource('minimal-es5-unminified')
      .addInvocation('build --unminified')
      .addInvocation('build -u')
      .addInvocation('build --unminified true')
      .addInvocation('build -u true')
      .forEach(slowIt(expectations))
      .finally(done);
  });
});

function expectations(testCase) {
  var workingBuildFile = helper.getConcatenation(testCase.cwd, BUILD_FOLDER);
  var sourceBuildFile  = helper.getConcatenation(testCase.sourceDir, BUILD_FOLDER);
  expect(testCase.stdout).toBeTask('build');
  expect(testCase.cwd).toHaveFile('app-build/index.html');
  expect(workingBuildFile('index.html')).diffFilePatch(sourceBuildFile('index.html'));
  javascriptSpec.expectations(testCase);
  cssSpec.expectations(testCase);
}

function customMatchers() {
  jasmine.addMatchers(diffMatchers.diffPatch);
  jasmine.addMatchers({
    toBeBuildHelpWithError  : matchers
      .getHelpMatcher(/^\s*The "build" task/)
  });
}

module.exports = {
  expectations  : expectations,
  customMatchers: customMatchers
};
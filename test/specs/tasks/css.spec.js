'use strict';

var diffMatchers = require('jasmine-diff-matchers');

var helper   = require('../../helpers/angularity-test'),
    matchers = require('../../helpers/jasmine-matchers');

var fastIt = helper.jasmineFactory({
  before: 0,
  after : 500
});

var slowIt = helper.jasmineFactory({
  before: 500,
  after : 1000
});

var BUILD_FOLDER = 'app-build';

describe('The Angularity css task', function () {

  beforeEach(matchers.addMatchers);

  beforeEach(customMatchers);

  beforeEach(helper.getTimeoutSwitch(60000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('should display help when requested', function (done) {
    helper.runner.create()
      .addInvocation('css --help')
      .addInvocation('css -h')
//    .addInvocation('css -?')  // TODO @bholloway process cannot be spawned on windows when it has -? flag
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect([testCase.cwd, BUILD_FOLDER]).toBeEmptyDirectory();
      expect(testCase.stderr).toBeCssHelpWithError(false);
    }
  });

  describe('should compile css correctly', function(done) {
    helper.runner.create()
      .addSource('minimal-es5')
      .addInvocation('css')
      .forEach(slowIt(expectations))
      .finally(done);
  });
});

function expectations(testCase) {
  var workingBuildFile = helper.getConcatenation(testCase.cwd, BUILD_FOLDER);
  var sourceBuildFile  = helper.getConcatenation(testCase.sourceDir, BUILD_FOLDER);
  expect(testCase.stdout).toBeTask('css');
  expect(testCase.cwd).toHaveExpectedCssExcept();
  expect(workingBuildFile('index.css')).diffFilePatch(sourceBuildFile('index.css'));
//  expect(workingBuildFile('index.css.map')).diffFilePatch(sourceBuildFile('index.css.map'));  // TODO @bholloway solve repeatability of .map files
}

function customMatchers() {
  jasmine.addMatchers(diffMatchers.diffPatch);
  jasmine.addMatchers({
    toBeCssHelpWithError   : matchers
      .getHelpMatcher(/^\s*The "css" task/),
    toHaveExpectedCssExcept: matchers
      .getFileMatcher('app-build/index.css', 'app-build/index.css.map')
  });
}

module.exports = {
  expectations  : expectations,
  customMatchers: customMatchers
};
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
var TEST_FOLDER  = 'app-test';

describe('The Angularity javascript task', function () {

  beforeEach(matchers.addMatchers);

  beforeEach(customMatchers);

  beforeEach(helper.getTimeoutSwitch(60000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('should display help when requested', function (done) {
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

  describe('should operate minified (by default)', function(done) {
    helper.runner.create()
      .addSource('minimal-es5')
      .addInvocation('javascript')
      .addInvocation('javascript --unminified false')
      .addInvocation('javascript -u false')
      .forEach(slowIt(expectations))
      .finally(done);
  });

  describe('should operate unminified', function(done) {
    helper.runner.create()
      .addSource('minimal-es5-unminified')
      .addInvocation('javascript --unminified')
      .addInvocation('javascript -u')
      .addInvocation('javascript --unminified true')
      .addInvocation('javascript -u true')
      .forEach(slowIt(expectations))
      .finally(done);
  });
});

function expectations(testCase) {
  var workingBuildFile = helper.getConcatenation(testCase.cwd, BUILD_FOLDER);
  var sourceBuildFile  = helper.getConcatenation(testCase.sourceDir, BUILD_FOLDER);
  var workingTestFile  = helper.getConcatenation(testCase.cwd, TEST_FOLDER);
  var sourceTestFile   = helper.getConcatenation(testCase.sourceDir, TEST_FOLDER);

  // general
  expect(testCase.stdout).toBeTask('javascript');
  expect(testCase.cwd).toHaveExpectedJsExcept();

  // build output
  expect(workingBuildFile('index.js')).diffFilePatch(sourceBuildFile('index.js'));
//  expect(workingBuildFile('index.js.map' )).diffFilePatch(sourceBuildFile('index.js.map'));   // TODO @bholloway solve repeatability of .map files

  // test output
  expect(workingTestFile('index.js')).diffFilePatch(sourceTestFile('index.js'));
//  expect(workingTestFile('index.js.map')).diffFilePatch(sourceTestFile('index.js.map'));    // TODO @bholloway solve repeatability of .map files

  // karma configuration differs between build and test
  if (/test/.test(testCase.command)) {

    // make replacements to allow karma.conf.js to be correctly diff'd
    var replace = helper.replacer()
      .add(/^(\s*basePath\:\s*['"])[^'"]*(['"].*)$/gm, '$1%redacted%$2')  // basePath should be redacted
      .add(/^(\s*require\(['"])[^'"]*(['"].*)$/gm,     '$1%redacted%$2')  // all require paths should be redacted
      .add(/\\{2}/g, '/')
      .commit();
    expect(replace(workingTestFile('karma.conf.js'))).diffPatch(replace(sourceTestFile('karma.conf.js')));
  }
}

function customMatchers() {
  jasmine.addMatchers(diffMatchers.diffPatch);
  jasmine.addMatchers({
    toBeJsHelpWithError   : matchers
      .getHelpMatcher(/^\s*The "javascript" task/),
    toHaveExpectedJsExcept: matchers
      .getFileMatcher(
        'app-build/index.js', 'app-build/index.js.map',
        'app-test/index.js',  'app-test/index.js.map',
        'app-test/karma.conf.js'
      )
  });
}

module.exports = {
  expectations  : expectations,
  customMatchers: customMatchers
};
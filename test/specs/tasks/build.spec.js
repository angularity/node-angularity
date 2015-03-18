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

describe('The Angularity build task', function () {

  beforeEach(matchers.addMatchers);

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
      expect(testCase.stderr).toBeHelpWithError(false);
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
  var workingTestFile  = helper.getConcatenation(testCase.cwd, TEST_FOLDER);
  var sourceTestFile   = helper.getConcatenation(testCase.sourceDir, TEST_FOLDER);

  // general
if (/test/.test(testCase.command)) {  // TODO @bholloway test should inherit JS not build
  expect(testCase.stdout).toBeTask('javascript');
} else {
  expect(testCase.stdout).toBeTask(['build', 'javascript', 'css']);
}
  expect(testCase.cwd).toHaveExpectedItemsExcept();

  // build output
  expect(workingBuildFile('index.html')).diffFilePatch(sourceBuildFile('index.html'));
  expect(workingBuildFile('index.js')).diffFilePatch(sourceBuildFile('index.js'));
  expect(workingBuildFile('index.css')).diffFilePatch(sourceBuildFile('index.css'));
//  expect(workingBuildFile('index.js.map' )).diffFilePatch(sourceBuildFile('index.js.map'));   // TODO @bholloway solve repeatability of .map files
//  expect(workingBuildFile('index.css.map')).diffFilePatch(sourceBuildFile('index.css.map'));  // TODO @bholloway solve repeatability of .map files

  // must remove basePath to allow karma.conf.js to be correctly diff'd
  var replace = helper.replacer()
    .add(/^\s*basePath:.*$/gm, '')
    .add(/^\s*require\(.*$/gm, '')
    .add(/\\{2}/g, '/')
    .commit();

  // test output
if (/test/.test(testCase.command)) {
  expect(replace(workingTestFile('karma.conf.js'))).diffPatch(replace(sourceTestFile('karma.conf.js')));  // TODO @bholloway reporter differs between build and test tasks
}
  expect(workingTestFile('index.js')).diffFilePatch(sourceTestFile('index.js'));
//  expect(workingTestFile('index.js.map')).diffFilePatch(sourceTestFile('index.js.map'));    // TODO @bholloway solve repeatability of .map files
}

function customMatchers() {
  jasmine.addMatchers(diffMatchers.diffPatch);
  jasmine.addMatchers({
    toBeHelpWithError        : matchers
      .getHelpMatcher(/^\s*The "build" task/),
    toHaveExpectedItemsExcept: matchers
      .getFileMatcher(
        'app-build/index.html',
        'app-build/index.js',  'app-build/index.js.map',
        'app-build/index.css', 'app-build/index.css.map',
        'app-test/karma.conf.js',
        'app-test/index.js',   'app-test/index.js.map'
      )
  });
}

module.exports = {
  expectations: expectations
};
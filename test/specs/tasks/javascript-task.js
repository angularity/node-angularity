'use strict';

var diffMatchers = require('jasmine-diff-matchers');

var helper   = require('./../../helpers/angularity-test'),
    matchers = require('./../../helpers/jasmine-matchers');

var BUILD_FOLDER = 'app-build';
var TEST_FOLDER  = 'app-test';

function expectations(testCase) {
  var workingBuildFile = helper.getConcatenation(testCase.cwd, BUILD_FOLDER);
  var sourceBuildFile  = helper.getConcatenation(testCase.sourceDir, testCase.subdir, BUILD_FOLDER);
  var workingTestFile  = helper.getConcatenation(testCase.cwd, TEST_FOLDER);
  var sourceTestFile   = helper.getConcatenation(testCase.sourceDir, TEST_FOLDER);

  // general
  expect(testCase.stdout).toBeTask('javascript');
  expect(testCase.cwd).toHaveExpectedJsExcept();

  // build output
  expect(workingBuildFile('index.js')).diffFilePatch(sourceBuildFile('index.js'));
//  expect(workingBuildFile('index.js.map' )).diffFilePatch(sourceBuildFile('index.js.map'));
// TODO @bholloway solve repeatability of .map files

  // test output
  expect(workingTestFile('index.js')).diffFilePatch(sourceTestFile('index.js'));
//  expect(workingTestFile('index.js.map')).diffFilePatch(sourceTestFile('index.js.map'));
// TODO @bholloway solve repeatability of .map files
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
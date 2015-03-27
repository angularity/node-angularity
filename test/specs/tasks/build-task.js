'use strict';

var diffMatchers = require('jasmine-diff-matchers');

var helper         = require('../../helpers/angularity-test'),
    matchers       = require('../../helpers/jasmine-matchers'),
    javascriptTask = require('./javascript-task'),
    cssTask        = require('./css-task');

var BUILD_FOLDER = 'app-build';

function expectations(testCase) {
  var workingBuildFile = helper.getConcatenation(testCase.cwd, BUILD_FOLDER);
  var sourceBuildFile  = helper.getConcatenation(testCase.sourceDir, testCase.subdir, BUILD_FOLDER);
  expect(testCase.stdout).toBeTask('build');
  expect(testCase.cwd).toHaveFile('app-build/index.html');
  expect(workingBuildFile('index.html')).diffFilePatch(sourceBuildFile('index.html'));
  javascriptTask.expectations(testCase);
  cssTask.expectations(testCase);
}

function customMatchers() {
  jasmine.addMatchers(diffMatchers.diffPatch);
  jasmine.addMatchers({
    toBeBuildHelpWithError  : matchers.getHelpMatcher(/^\s*The "build" task/)
  });
}

module.exports = {
  expectations  : expectations,
  customMatchers: customMatchers
};
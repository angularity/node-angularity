'use strict';

var diffMatchers = require('jasmine-diff-matchers'),
    fs           = require('fs'),
    path         = require('path');

var helper   = require('./../../helpers/angularity-test'),
    matchers = require('./../../helpers/jasmine-matchers');

var BUILD_FOLDER = 'app-build';

function expectations(testCase) {
  var workingBuildFile = helper.getConcatenation(testCase.cwd, BUILD_FOLDER);
  var sourceBuildFile  = helper.getConcatenation(testCase.sourceDir, testCase.subdir, BUILD_FOLDER);

  // general
  expect(testCase.stdout).toBeTask('css');

  // build output
  expect(testCase.cwd).toHaveExpectedCssExcept();
  expect(workingBuildFile('index.css')).diffFilePatch(sourceBuildFile('index.css'));
  //  expect(workingBuildFile('index.css.map')).diffFilePatch(sourceBuildFile('index.css.map'));
  // TODO @bholloway solve repeatability of .map files

  // css assets
  var assetDir = path.join.apply(path, sourceBuildFile('index.css.assets'));
  if (fs.existsSync(assetDir)) {
    fs.readdirSync(assetDir)
      .forEach(function eachAsset(relative) {
        console.log(relative);
        expect(workingBuildFile(relative)).diffFilePatch(sourceBuildFile(relative));
      });
  }
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
'use strict';

var fs   = require('fs'),
    path = require('path');

var jasmineDiffMatchers = require('jasmine-diff-matchers');

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

  beforeEach(helper.getTimeoutSwitch(30000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('with help switch', function (done) {
    helper.runner.create()
      .addInvocation('build --help')
      .addInvocation('build -h')
      .addInvocation('build -?')
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect([testCase.cwd, BUILD_FOLDER]).toBeEmptyDirectory();
      expect(testCase.stderr).toBeHelpWithError(false);
    }
  });

  describe('with the minimal-es5 project', function(done) {
    helper.runner.create()
      .addSource('minimal-es5')
      .addInvocation('build')
      .addInvocation('build --unminified false')
      .addInvocation('build -u false')
      .forEach(slowIt(expectations))
      .finally(done);
  });

  describe('with the minimal-es5 project unminified', function(done) {
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
  expect(testCase.stdout).toBeTask(['build', 'javascript', 'css']);
  expect(testCase.cwd).toHaveExpectedItemsExcept();

  // build output
  expect(workingBuildFile('index.js'     )).diffFilePatch(sourceBuildFile('index.js'));
//  expect(workingBuildFile('index.js.map' )).diffFilePatch(sourceBuildFile('index.js.map'));   // TODO @bholloway solve repeatability of .map files
  expect(workingBuildFile('index.css'    )).diffFilePatch(sourceBuildFile('index.css'));
//  expect(workingBuildFile('index.css.map')).diffFilePatch(sourceBuildFile('index.css.map'));  // TODO @bholloway solve repeatability of .map files

  // must replace cwd to allow karam.conf.js to be correctly diffed
  replaceInFile(workingTestFile('karma.conf.js'), testCase.cwd, testCase.sourceDir);

  // test output
  expect(workingTestFile('karma.conf.js')).diffFilePatch(sourceTestFile('karma.conf.js'));
  expect(workingTestFile('index.js'     )).diffFilePatch(sourceTestFile('index.js'));
//  expect(workingTestFile('index.js.map' )).diffFilePatch(sourceTestFile('index.js.map'));     // TODO @bholloway solve repeatability of .map files
}

function customMatchers() {
  jasmine.addMatchers(jasmineDiffMatchers.diffPatch);
  jasmine.addMatchers({
    toBeHelpWithError         : matchers
      .getHelpMatcher(/^\s*The "build" task/),
    toHaveExpectedItemsExcept : matchers
      .getFileMatcher(
        'app-build/index.html',
        'app-build/index.js',  'app-build/index.js.map',
        'app-build/index.css', 'app-build/index.css.map',
        'app-test/karma.conf.js',
        'app-test/index.js',   'app-test/index.js.map'
      )
  });
}

function replaceInFile(pathElements, before, after) {
  var filePath = path.resolve.apply(path, [].concat(pathElements));
  var contents = fs.existsSync(filePath) && fs.readFileSync(filePath).toString();
  if (contents) {
    while (contents.indexOf(before) >= 0) {
      contents = contents.replace(before, after);
    }
    fs.writeFileSync(filePath, contents);
  }
}
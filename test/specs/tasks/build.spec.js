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
//    .addInvocation('build -?')  // TODO @bholloway process cannot be spawned on windows when it has -? flag
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
  expect(workingBuildFile('index.js')).diffFilePatch(sourceBuildFile('index.js'));
  expect(workingBuildFile('index.css')).diffFilePatch(sourceBuildFile('index.css'));
//  expect(workingBuildFile('index.js.map' )).diffFilePatch(sourceBuildFile('index.js.map'));   // TODO @bholloway solve repeatability of .map files
//  expect(workingBuildFile('index.css.map')).diffFilePatch(sourceBuildFile('index.css.map'));  // TODO @bholloway solve repeatability of .map files

  // must remove basePath to allow karam.conf.js to be correctly diff'd
  var replace = replacer()
    .add(/^\s*basePath:.*$/gm, '')
    .add(/\\{2}/g, '/')
    .commit();

  // test output
  expect(replace(workingTestFile('karma.conf.js'))).diffPatch(replace(sourceTestFile('karma.conf.js')));
  expect(workingTestFile('index.js')).diffFilePatch(sourceTestFile('index.js'));
//  expect(workingTestFile('index.js.map')).diffFilePatch(sourceTestFile('index.js.map'));    // TODO @bholloway solve repeatability of .map files

}

function customMatchers() {
  jasmine.addMatchers(jasmineDiffMatchers.diffPatch);
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

function replacer() {
  var list = [];
  var self = {
    add: function(before, after) {
      list.push({
        before: before,
        after : after
      });
      return self;
    },
    commit: function() {
      return function(pathElements) {
        var filePath = path.resolve.apply(path, [].concat(pathElements));
        var text     = fs.existsSync(filePath) && fs.readFileSync(filePath).toString();
        function replaceSingle(item) {
          if (text) {
            if (typeof item.before === 'string') {
              while (text.indexOf(item.before) >= 0) {
                text = text.replace(item.before, item.after);
              }
            } else if ((typeof item.before === 'object') && ('test' in item.before)) {
              text = text.replace(item.before, item.after);
            }
          }
          return text;
        }
        list.forEach(replaceSingle);
        return text;
      };
    }
  };
  return self;
}
'use strict';

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

  beforeEach(helper.getTimeoutSwitch(10000));

  afterEach(helper.getTimeoutSwitch());

//  afterEach(helper.cleanUp);

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
  expect(testCase.stdout).toBeTask(['build', 'javascript', 'css']);
  expect(testCase.cwd).toHaveExpectedItemsExcept();
  expect([testCase.cwd, BUILD_FOLDER, 'index.js' ]).diffFilePatch([testCase.sourceDir, BUILD_FOLDER, 'index.js' ]);
  expect([testCase.cwd, BUILD_FOLDER, 'index.css']).diffFilePatch([testCase.sourceDir, BUILD_FOLDER, 'index.css']);
  expect([testCase.cwd, TEST_FOLDER,  'index.js ']).diffFilePatch([testCase.sourceDir, TEST_FOLDER,  'index.js ']);
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
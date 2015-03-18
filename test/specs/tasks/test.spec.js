'use strict';

var helper         = require('../../helpers/angularity-test'),
    matchers       = require('../../helpers/jasmine-matchers'),
    javascriptTask = require('./javascript-task');

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

describe('The Angularity test task', function () {

  beforeEach(matchers.addMatchers);

  beforeEach(javascriptTask.customMatchers);

  beforeEach(customMatchers);

  beforeEach(helper.getTimeoutSwitch(60000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('should display help when requested', function (done) {
    helper.runner.create()
      .addInvocation('test --help')
      .addInvocation('test -h')
//    .addInvocation('test -?')  // TODO @bholloway process cannot be spawned on windows when it has -? flag
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect([testCase.cwd, BUILD_FOLDER]).toBeEmptyDirectory();
      expect([testCase.cwd, TEST_FOLDER ]).toBeEmptyDirectory();
      expect(testCase.stderr).toBeHelpWithError(false);
    }
  });

  describe('should build unminified javascript and run tests', function(done) {
    helper.runner.create()
      .addSource('minimal-es5')
      .addInvocation('test')
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect(testCase.stdout).toBeTask('test');
      expect(testCase.stdout).toMatch(/INFO\s\[karma\]/);  // TODO @bholloway choose a browser that will work on cloud CI
      javascriptTask.expectations(testCase);

      // make replacements to allow karma.conf.js to be correctly diff'd
      var workingTestFile = helper.getConcatenation(testCase.cwd, TEST_FOLDER);
      var sourceTestFile  = helper.getConcatenation(testCase.sourceDir, TEST_FOLDER);
      var replace         = helper.replacer()
        .add(/^(\s*basePath\:\s*['"])[^'"]*(['"].*)$/gm, '$1%redacted%$2')  // basePath should be redacted
        .add(/^(\s*require\(['"])[^'"]*(['"].*)$/gm,     '$1%redacted%$2')  // all require paths should be redacted
        .add(/\\{2}/g, '/')
        .commit();
      expect(replace(workingTestFile('karma.conf.js'))).diffPatch(replace(sourceTestFile('karma.conf.js')));
    }
  });

  describe('should not support unminified option', function(done) {
    helper.runner.create()
      .addSource('minimal-es5-unminified')
      .addInvocation('test --unminified')
      .addInvocation('test -u')
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      if (!testCase.exitcode) {  // TODO @bholloway windows invocation fails in test but not in real use
        expect(testCase.stderr).toBeHelpWithError(true);
      }
    }
  });
});

function customMatchers() {
  jasmine.addMatchers({
    toBeHelpWithError: matchers.getHelpMatcher(/^\s*The "test" task/)
  });
}
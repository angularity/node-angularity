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

var RELEASE_FOLDER = 'app-release';
var VENDOR_FOLDER  = 'vendor';

describe('The Angularity release task', function () {

  beforeEach(matchers.addMatchers);

  beforeEach(customMatchers);

  beforeEach(helper.getTimeoutSwitch(90000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('should display help where requested', function (done) {
    helper.runner.create()
      .addInvocation('release --help')
      .addInvocation('release -h')
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect([testCase.cwd, RELEASE_FOLDER]).toBeEmptyDirectory();
      expect(testCase.stderr).toBeHelpWithError(false);
    }
  });

  describe('full test with small application', function() {
    describe('should operate minified (by default)', function (done) {
      helper.runner.create()
        .addSource('angularity-helloworld-es5')
        .addParameters({subdir: 'app-minified'})
        .addInvocation('release')
        .addInvocation('release --unminified false')
        .addInvocation('release -u false')
        .forEach(slowIt(expectations))
        .finally(done);
    });

    describe('should operate unminified', function (done) {
      helper.runner.create()
        .addSource('angularity-helloworld-es5')
        .addParameters({subdir: 'app-unminified'})
        .addInvocation('release --unminified')
        .addInvocation('release -u')
        .addInvocation('release --unminified true')
        .addInvocation('release -u true')
        .forEach(slowIt(expectations))
        .finally(done);
    });
  });

  describe('smoke test with larger application', function() {
    describe('should operate minified (by default)', function (done) {
      helper.runner.create()
        .addSource('angularity-todo-es5')
        .addParameters({subdir: 'app-minified'})
        .addInvocation('release')
        .forEach(slowIt(expectations))
        .finally(done);
    });

    describe('should operate unminified', function (done) {
      helper.runner.create()
        .addSource('angularity-todo-es5')
        .addParameters({subdir: 'app-unminified'})
        .addInvocation('release -u')
        .forEach(slowIt(expectations))
        .finally(done);
    });
  });
});

function expectations(testCase) {
  var workingReleaseFile = helper.getConcatenation(testCase.cwd, RELEASE_FOLDER);
  var workingVendorFile  = helper.getConcatenation(testCase.cwd, RELEASE_FOLDER, VENDOR_FOLDER);
  var sourceReleaseFile  = helper.getConcatenation(testCase.sourceDir, testCase.subdir, RELEASE_FOLDER);
  var sourceVendorFile   = helper.getConcatenation(testCase.sourceDir, testCase.subdir, RELEASE_FOLDER, VENDOR_FOLDER);

  // general
  expect(testCase.stdout).toBeTask(['release', 'build', 'javascript', 'css']);
  expect(testCase.cwd).toHaveExpectedItemsExcept();

  // release output
  expect(workingReleaseFile('index.html')).diffFilePatch(sourceReleaseFile('index.html'));
  expect(workingReleaseFile('index.js')).diffFilePatch(sourceReleaseFile('index.js'));
  expect(workingReleaseFile('index.css')).diffFilePatch(sourceReleaseFile('index.css'));
//  expect(workingReleaseFile('index.js.map' )).diffFilePatch(sourceReleaseFile('index.js.map'));
// TODO @bholloway solve repeatability of .map files
//  expect(workingReleaseFile('index.css.map')).diffFilePatch(sourceReleaseFile('index.css.map'));
// TODO @bholloway solve repeatability of .map files

  // vendor files
  expect(workingVendorFile('manifest.json')).diffFilePatch(sourceVendorFile('manifest.json'));
  expect(workingVendorFile('jquery', 'jquery.js')).diffFilePatch(sourceVendorFile('jquery', 'jquery.js'));
  expect(workingVendorFile('angular', 'angular.js')).diffFilePatch(sourceVendorFile('angular', 'angular.js'));
  expect(workingVendorFile('angular-ui-router', 'angular-ui-router.js'))
    .diffFilePatch(sourceVendorFile('angular-ui-router', 'angular-ui-router.js'));
}

function customMatchers() {
  jasmine.addMatchers(diffMatchers.diffPatch);
  jasmine.addMatchers({
    toBeHelpWithError        : matchers
      .getHelpMatcher(/^\s*The "release" task/),
    toHaveExpectedItemsExcept: matchers
      .getFileMatcher(
        'app-release/index.html',
        'app-release/index.js',  'app-build/index.js.map',
        'app-release/index.css', 'app-build/index.css.map',
        'app-release/vendor/manifest.json',
        'app-release/vendor/jquery/jquery.js',
        'app-release/vendor/angular/angular.js',
        'app-release/vendor/angular-ui-router/angular-ui-router.js'
      )
  });
}
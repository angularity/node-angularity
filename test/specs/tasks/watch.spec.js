'use strict';

var helper    = require('../../helpers/angularity-test'),
    matchers  = require('../../helpers/jasmine-matchers'),
    buildTask = require('./build-task');

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

describe('The Angularity watch task', function () {

  beforeEach(matchers.addMatchers);

  beforeEach(buildTask.customMatchers);

  beforeEach(customMatchers);

  beforeEach(helper.getTimeoutSwitch(90000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('should display help when requested', function (done) {
    helper.runner.create()
      .addInvocation('watch --help')
      .addInvocation('watch -h')
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect([testCase.cwd, BUILD_FOLDER]).toBeEmptyDirectory();
      expect([testCase.cwd, TEST_FOLDER ]).toBeEmptyDirectory();
      expect(testCase.stderr).toBeWatchHelpWithError(false);
    }
  });

  describe('should operate minified (by default)', function(done) {
    helper.runner.create()
      .addSource('angularity-helloworld-es5')
      .addParameters({ subdir: 'app-minified' })
      .addInvocation('watch')
      .addInvocation('watch --unminified false')
      .addInvocation('watch -u false')
      .forEach(slowIt(expectations, progress))
      .finally(done);
  });

  describe('should operate unminified', function(done) {
    helper.runner.create()
      .addSource('angularity-helloworld-es5')
      .addParameters({ subdir: 'app-unminified' })
      .addInvocation('watch --unminified')
      .addInvocation('watch -u')
      .addInvocation('watch --unminified true')
      .addInvocation('watch -u true')
      .forEach(slowIt(expectations, progress))
      .finally(done);
  });
});

function progress(testCase) {
  if (/Finished 'watch'/.test(testCase.stdout)) {
    testCase.kill();
  }
}

function expectations(testCase) {
  expect(testCase.stdout).toBeTask('watch', 'sever');
  buildTask.expectations(testCase);
  // TODO @bholloway more test coverage on webstorm task
}

function customMatchers() {
  jasmine.addMatchers({
    toBeWatchHelpWithError: matchers.getHelpMatcher(/^\s*The "watch" task/)
  });
}
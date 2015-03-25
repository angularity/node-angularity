'use strict';

var helper   = require('../../helpers/angularity-test'),
    matchers = require('../../helpers/jasmine-matchers'),
    cssTask  = require('./css-task');

var fastIt = helper.jasmineFactory({
  before: 0,
  after : 500
});

var slowIt = helper.jasmineFactory({
  before: 500,
  after : 1000
});

var BUILD_FOLDER = 'app-build';

describe('The Angularity css task', function () {

  beforeEach(matchers.addMatchers);

  beforeEach(cssTask.customMatchers);

  beforeEach(helper.getTimeoutSwitch(90000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('should display help when requested', function (done) {
    helper.runner.create()
      .addInvocation('css --help')
      .addInvocation('css -h')
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect([testCase.cwd, BUILD_FOLDER]).toBeEmptyDirectory();
      expect(testCase.stderr).toBeCssHelpWithError(false);
    }
  });

  describe('should compile css correctly', function(done) {
    helper.runner.create()
      .addSource('angularity-helloworld-es5')
      .addParameters({ subdir: 'app-minified' })
      .addInvocation('css')
      .forEach(slowIt(cssTask.expectations))
      .finally(done);
  });
});
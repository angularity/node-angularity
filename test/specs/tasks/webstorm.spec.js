'use strict';

var helper   = require('../../helpers/angularity-test'),
    matchers = require('../../helpers/jasmine-matchers'),
    platform = require('../../../lib/config/platform');

var fastIt = helper.jasmineFactory({
  before: 0,
  after : 500
});

var slowIt = helper.jasmineFactory({
  before: 500,
  after : 1000
});

var FLAGS = [ 'project', 'external', 'codestyle', 'templates', 'launch' ];

// TODO @bholloway appveyor fails any webstorm command with exitcode 1 and nothing on stdout or stderr
if (!platform.isAppveyor()) {

  describe('The Angularity webstorm task', function () {

    beforeEach(matchers.addMatchers);

    beforeEach(customMatchers);

    beforeEach(helper.getTimeoutSwitch(90000));

    afterEach(helper.getTimeoutSwitch());

    afterEach(helper.cleanUp);

    describe('should display help when requested', function (done) {
      helper.runner.create()
        .addInvocation('webstorm --help')
        .addInvocation('webstorm -h')
        .forEach(fastIt(expectations))
        .finally(done);

      function expectations(testCase) {
        expect(testCase.stderr).toBeBuildHelpWithError(false);
      }
    });

    describe('should fail where angularity.json is not present', function (done) {
      helper.runner.create()
        .addSource('angularity-helloworld-es5')
        .withSourceFilter(function removeBuildFiles(value) {
          return !(/angularity.json$/.test(value));
        })
        .addInvocation('webstorm', FLAGS.map(composeOption(false)))
        .forEach(slowIt(expectations))
        .finally(done);

      function expectations(testCase) {
        expect(testCase.stderr).toBeBuildHelpWithError(true);
      }
    });

    describe('should operate with all flags false', function (done) {
      helper.runner.create()
        .addSource('angularity-helloworld-es5')
        .addInvocation('webstorm', FLAGS.map(composeOption(false)))
        .forEach(slowIt(expectations))
        .finally(done);

      function expectations(testCase) {
        expect(testCase.stdout).toBeTask('webstorm');
      }
    });

    // TODO @bholloway more test coverage on webstorm task
  });
}

function composeOption(boolean) {
  return function optionToInvocation(option) {
    return ((option.length > 1) ? '--' : '-') + option + ' ' + boolean;
  };
}

function customMatchers() {
  jasmine.addMatchers({
    toBeBuildHelpWithError: matchers.getHelpMatcher(/^\s*The "webstorm" task/)
  });
}
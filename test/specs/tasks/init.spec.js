/* jshint -W082 */
'use strict';

var Q = require('q');

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

var DEFAULT_NAME        = 'my-project';
var DEFAULT_VERSION     = '0.0.0';
var DEFAULT_DESCRIPTION = '';
var DEFAULT_TAGS        = [];
var DEFAULT_PORT        = /^(?!55555)\d{5}$/;
var FILES_BY_FLAG       = {
    npm         : 'package.json',
    bower       : 'bower.json',
    karma       : 'karma.conf.js',
    jshint      : '.jshintrc',
    gitignore   : '.gitignore',
    editorconfig: '.editorconfig'
  };

describe('The Angularity init task', function () {

  beforeEach(matchers.addMatchers);

  beforeEach(customMatchers);

  afterEach(helper.cleanUp);

  describe('with help switch', function (done) {
    helper.runner.create()
      .addInvocation('init --help')
      .addInvocation('init -h')
      .addInvocation('init -?')
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect(testCase.cwd).toBeEmptyDirectory();
      expect(testCase.stderr).toBeHelpWithError(false);
    }
  });

  describe('directory creation', function () {
    it('should rerun in any directory with package.json', function(done) {
      helper.runner.create()
        .addInvocation('init')
        .run()
        .then(delay(500))
        .then(expectations)
        .then(helper.getFileDelete(DEFAULT_NAME, ['*', '.*', 'app', '!**/package.json']))
        .then(delay(1000))
        .then(rerun)
        .then(delay(500))
        .then(expectations)
        .finally(done);

      function delay(milliseconds) {
        return function () {
          return Q.delay(milliseconds || 0);
        };
      }

      function rerun(testCase) {
        return testCase.runner.run();
      }

      function expectations(testCase) {
        expect(testCase.stdout).toBeTask('init');
        expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveExpectedItemsExcept();
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithName(DEFAULT_NAME);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithVersion(DEFAULT_VERSION);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithTags(DEFAULT_TAGS);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithPort(DEFAULT_PORT);
        return testCase;
      }
    });

  });

  describe('should support a custom name', function (done) {
    helper.runner.create()
      .addInvocation('init --name {name}')
      .addInvocation('init -n {name}')
      .addParameters({ name: 'foo' })
      .addParameters({ name: '"a name with spaces"' })
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      var unquotedName = testCase.name.replace(/^"|"$/g, '');
      expect(testCase.stdout).toBeTask('init');
      expect(testCase.cwd).toHaveDirectory(unquotedName);
      expect([testCase.cwd, unquotedName]).toHaveExpectedItemsExcept();
      expect([testCase.cwd, unquotedName]).toHaveJsonWithName(unquotedName);
      expect([testCase.cwd, unquotedName]).toHaveJsonWithVersion(DEFAULT_VERSION);
      expect([testCase.cwd, unquotedName]).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
      expect([testCase.cwd, unquotedName]).toHaveJsonWithTags(DEFAULT_TAGS);
      expect([testCase.cwd, unquotedName]).toHaveJsonWithPort(DEFAULT_PORT);
    }
  });

  describe('should support a custom version', function (done) {
    helper.runner.create()
      .addParameters({ version: '1.2.3' })
      .addParameters({ version: '4.6.6-rc2A' })
      .addParameters({ version: '"non semver string"' })
      .addInvocation('init --version {version}')
      .addInvocation('init -v {version}')
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      var unquotedVersion = testCase.version.replace(/^"|"$/g, '');
      if (/\s/.test(unquotedVersion)) {
        expect(testCase.stderr).toBeHelpWithError(true);
      } else {
        expect(testCase.stdout).toBeTask('init');
        expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveExpectedItemsExcept();
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithName(DEFAULT_NAME);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithVersion(unquotedVersion);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithTags(DEFAULT_TAGS);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithPort(DEFAULT_PORT);
      }
    }
  });

  describe('should support a custom description', function (done) {
    helper.runner.create()
      .addParameters({ description: '""' })
      .addParameters({ description: '"A few words"' })
      .addInvocation('init --description {description}')
      .addInvocation('init -d {description}')
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      if (testCase.command === 'angularity init -d ""') return; // TODO yargs short form seems to fail with empty string

      var unquotedDescription = testCase.description.replace(/^"|"$/g, '');
      expect(testCase.stdout).toBeTask('init');
      expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
      expect([testCase.cwd, DEFAULT_NAME]).toHaveExpectedItemsExcept();
      expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithName(DEFAULT_NAME);
      expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithVersion(DEFAULT_VERSION);
      expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithDescription(unquotedDescription);
      expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithTags(DEFAULT_TAGS);
      expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithPort(DEFAULT_PORT);
    }
  });

  describe('should support custom tags', function (done) {
    helper.runner.create()
      .addParameters({ tag1: 'a', tag2: 'b', tags: ['a', 'b'] })
      .addParameters({ tag1: 1, tag2: '"some long tag"', tags: ['1', 'some long tag'] })
      .addInvocation('init --tag {tag1}')
      .addInvocation('init -t {tag1}')
      .addInvocation('init --tag {tag1} --tag {tag2}')
      .addInvocation('init -t {tag1} -t {tag2}')
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      var tagCount = testCase.command.split(/-t/g).length - 1;
      var tags     = testCase.tags.slice(0, tagCount);
      expect(testCase.stdout).toBeTask('init');
      expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
      expect([testCase.cwd, DEFAULT_NAME]).toHaveExpectedItemsExcept();
      expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithName(DEFAULT_NAME);
      expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithVersion(DEFAULT_VERSION);
      expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
      expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithTags(tags);
      expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithPort(DEFAULT_PORT);
    }
  });

  describe('should support a custom port', function (done) {
    helper.runner.create()
      .addParameters({ port: 'random' })
      .addParameters({ port: 12345 })
      .addParameters({ port: 'illegal' })
      .addInvocation('init --port {port}')
      .addInvocation('init -p {port}')
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      if (testCase.port === 'illegal') {
        expect(testCase.stderr).toBeHelpWithError(true);
      } else {
        var port = (testCase.port === 'random') ? DEFAULT_PORT : testCase.port;
        expect(testCase.stdout).toBeTask('init');
        expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveExpectedItemsExcept();
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithName(DEFAULT_NAME);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithVersion(DEFAULT_VERSION);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithTags(DEFAULT_TAGS);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithPort(port);
      }
    }
  });

  describe('should gate features using flags', function (done) {

    // invocation will consist of all flags and their boolean values
    var fields     = Object.getOwnPropertyNames(FILES_BY_FLAG);
    var invocation = ['init'].concat(fields
      .map(function toFlag(field) {
        return '--' + field + ' {' + field + '}';
      })
      .join(' '));

    // create the runner
    var runner = helper.runner.create()
      .addInvocation(invocation);

    // add flag permutations
    helper
      .randomFlags(fields)
      .forEach(runner.addParameters.bind(runner));

    // now run
    runner
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      var exceptions = fields
        .filter(function testNegated(field) {
          return !testCase[field];
        })
        .map(function lookupFile(field) {
          return FILES_BY_FLAG[field];
        });
      expect(testCase.stdout).toBeTask('init');
      expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
      expect([testCase.cwd, DEFAULT_NAME]).toHaveExpectedItemsExcept(exceptions);
    }
  });

});

function customMatchers() {
  jasmine.addMatchers({
    toHaveJsonWithName        : matchers
      .getFileFieldMatcher(['bower.json', 'package.json', 'angularity.json'], 'name'),
    toHaveJsonWithVersion     : matchers
      .getFileFieldMatcher(['bower.json', 'package.json', 'angularity.json'], 'version'),
    toHaveJsonWithDescription : matchers
      .getFileFieldMatcher(['bower.json', 'package.json'], 'description'),
    toHaveJsonWithTags        : matchers
      .getFileFieldMatcher(['bower.json', 'package.json'], 'tags'),
    toHaveJsonWithPort        : matchers
      .getFileFieldMatcher(['angularity.json'], 'port'),
    toBeHelpWithError         : matchers
      .getHelpMatcher(/^\s*The "init" task/),
    toHaveExpectedItemsExcept : matchers
      .getFileMatcher('package.json', 'bower.json', 'angularity.json', '.jshintrc', '.gitignore', '.editorconfig',
        'karma.conf.js', 'app/index.html', 'app/index.js', 'app/index.scss')
  });
}

/* jshint -W082 */
'use strict';

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

  beforeEach(helper.getTimeoutSwitch(90000));

  afterEach(helper.getTimeoutSwitch());

  afterEach(helper.cleanUp);

  describe('should display help when requested', function (done) {
    helper.runner.create()
      .addInvocation('init --help')
      .addInvocation('init -h')
      .forEach(fastIt(expectations))
      .finally(done);

    function expectations(testCase) {
      expect(testCase.cwd).toBeEmptyDirectory();
      expect(testCase.stderr).toBeHelpWithError(false);
    }
  });

  describe('should rerun in any directory with package.json', function () {
    it('init', function(done) {
      helper.runner.create()
        .addInvocation('init')
        .run()
        .then(helper.getDelay(500))
        .then(expectations)
        .then(helper.getFileDelete(DEFAULT_NAME, ['*', '.*', 'app', '!**/package.json']))
        .then(helper.getDelay(1000))
        .then(rerun)
        .then(helper.getDelay(500))
        .then(expectations)
        .finally(done);

      function rerun(testCase) {
        return testCase.runner.run();
      }

      function expectations(testCase) {
        var projectPath = [testCase.cwd, DEFAULT_NAME];
        expect(testCase.stdout).toBeTask('init');
        expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
        expect(projectPath).toHaveExpectedItemsExcept();
        expect(projectPath).toHaveJsonWithName(DEFAULT_NAME);
        expect(projectPath).toHaveJsonWithVersion(DEFAULT_VERSION);
        expect(projectPath).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
        expect(projectPath).toHaveJsonWithTags(DEFAULT_TAGS);
        expect(projectPath).toHaveJsonWithPort(DEFAULT_PORT);
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
      var projectPath  = [testCase.cwd, unquotedName];
      expect(testCase.stdout).toBeTask('init');
      expect(testCase.cwd).toHaveDirectory(unquotedName);
      expect(projectPath).toHaveExpectedItemsExcept();
      expect(projectPath).toHaveJsonWithName(unquotedName);
      expect(projectPath).toHaveJsonWithVersion(DEFAULT_VERSION);
      expect(projectPath).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
      expect(projectPath).toHaveJsonWithTags(DEFAULT_TAGS);
      expect(projectPath).toHaveJsonWithPort(DEFAULT_PORT);
    }
  });

  describe('should support a custom version', function (done) {
    helper.runner.create()
      .addParameters({ version: '1.2.3' })
      .addParameters({ version: '4.6.6-rc2A' })
//    .addParameters({ version: '"non semver string"', illegal: true })
//    TODO @bholloway doesn't invoke correctly on windows
      .addInvocation('init --version {version}')
      .addInvocation('init -v {version}')
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      var unquotedVersion = testCase.version.replace(/^"|"$/g, '');
      var projectPath     = [testCase.cwd, DEFAULT_NAME];
      if (testCase.illegal) {
        expect(testCase.stderr).toBeHelpWithError(true);
      } else {
        expect(testCase.stdout).toBeTask('init');
        expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
        expect(projectPath).toHaveExpectedItemsExcept();
        expect(projectPath).toHaveJsonWithName(DEFAULT_NAME);
        expect(projectPath).toHaveJsonWithVersion(unquotedVersion);
        expect(projectPath).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
        expect(projectPath).toHaveJsonWithTags(DEFAULT_TAGS);
        expect(projectPath).toHaveJsonWithPort(DEFAULT_PORT);
      }
    }
  });

  describe('should support a custom description', function (done) {
    helper.runner.create()
//    .addParameters({ description: '""' })   // TODO -d "" fails on mac, -description "" fails on windows
      .addParameters({ description: '"A few words"' })
      .addInvocation('init --description {description}')
      .addInvocation('init -d {description}')
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      var unquotedDescription = testCase.description.replace(/^"|"$/g, '');
      var projectPath         = [testCase.cwd, DEFAULT_NAME];
      expect(testCase.stdout).toBeTask('init');
      expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
      expect(projectPath).toHaveExpectedItemsExcept();
      expect(projectPath).toHaveJsonWithName(DEFAULT_NAME);
      expect(projectPath).toHaveJsonWithVersion(DEFAULT_VERSION);
      expect(projectPath).toHaveJsonWithDescription(unquotedDescription);
      expect(projectPath).toHaveJsonWithTags(DEFAULT_TAGS);
      expect(projectPath).toHaveJsonWithPort(DEFAULT_PORT);
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
      var tagCount    = testCase.command.split(/-t/g).length - 1;
      var tags        = testCase.tags.slice(0, tagCount);
      var projectPath = [testCase.cwd, DEFAULT_NAME];
      expect(testCase.stdout).toBeTask('init');
      expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
      expect(projectPath).toHaveExpectedItemsExcept();
      expect(projectPath).toHaveJsonWithName(DEFAULT_NAME);
      expect(projectPath).toHaveJsonWithVersion(DEFAULT_VERSION);
      expect(projectPath).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
      expect(projectPath).toHaveJsonWithTags(tags);
      expect(projectPath).toHaveJsonWithPort(DEFAULT_PORT);
    }
  });

  describe('should support a custom port', function (done) {
    helper.runner.create()
      .addParameters({ port: 'random' })
      .addParameters({ port: 12345 })
//    .addParameters({ port: 'illegal', illegal: true })   // TODO @bholloway doesn't invoke correctly on windows
      .addInvocation('init --port {port}')
      .addInvocation('init -p {port}')
      .forEach(slowIt(expectations))
      .finally(done);

    function expectations(testCase) {
      if (testCase.illegal) {
        expect(testCase.stderr).toBeHelpWithError(true);
      } else {
        var port        = (testCase.port === 'random') ? DEFAULT_PORT : testCase.port;
        var projectPath = [testCase.cwd, DEFAULT_NAME];
        expect(testCase.stdout).toBeTask('init');
        expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
        expect(projectPath).toHaveExpectedItemsExcept();
        expect(projectPath).toHaveJsonWithName(DEFAULT_NAME);
        expect(projectPath).toHaveJsonWithVersion(DEFAULT_VERSION);
        expect(projectPath).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
        expect(projectPath).toHaveJsonWithTags(DEFAULT_TAGS);
        expect(projectPath).toHaveJsonWithPort(port);
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
      var projectPath = [testCase.cwd, DEFAULT_NAME];
      var exceptions  = fields
        .filter(function testNegated(field) {
          return !testCase[field];
        })
        .map(function lookupFile(field) {
          return FILES_BY_FLAG[field];
        });
      expect(testCase.stdout).toBeTask('init');
      expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
      expect(projectPath).toHaveExpectedItemsExcept(exceptions);
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
      .getFileMatcher('package.json', 'bower.json', 'angularity.json', '.jshintrc', /*'.gitignore',*/ '.editorconfig',
        'karma.conf.js', 'app/index.html', 'app/index.js', 'app/index.scss')
    // TODO @bholloway why does .gitignore go missing on travis
  });
}

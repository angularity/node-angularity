/* globals describe, expect, beforeEach, jasmine */
'use strict';

var fs   = require('fs'),
    path = require('path');

var helper   = require('../../helpers/angularity-test'),
    matchers = require('../../helpers/jasmine-matchers');

var DEFAULT_NAME        = 'my-project';
var DEFAULT_VERSION     = '0.0.0';
var DEFAULT_DESCRIPTION = '';
var DEFAULT_TAGS        = [];
var DEFAULT_PORT        = /^(?!55555)\d{5}$/;

describe('The Angularity init task', function () {

  beforeEach(matchers.addFileMatchers);

  beforeEach(customMatchers);

  describe('command line help', function (done) {
    helper.runner.create()
      .addInvocation('init --help')
      .addInvocation('init -h')
      .addInvocation('init -?')
      .forEach(helper.forEachIt(function (testCase) {
        expect(testCase.cwd).toBeEmptyDirectory();
        expect(testCase.stdout).toBeHelpWithError(false);
      }))
      .finally(done);
  });

  describe('should support a custom name', function (done) {
    helper.runner.create()
      .addInvocation('init --name {name}')
      .addInvocation('init -n {name}')
      .addParameters({ name: 'foo' })
      .addParameters({ name: '"a name with spaces"' })
      .forEach(helper.forEachIt(function (testCase) {
        var unquotedName = testCase.name.replace(/"/g, '');
        expect(testCase.cwd).toHaveDirectory(unquotedName);
        expect([testCase.cwd, unquotedName]).toHaveExpectedItemsExcept();
        expect([testCase.cwd, unquotedName]).toHaveJsonWithName(unquotedName);
        expect([testCase.cwd, unquotedName]).toHaveJsonWithVersion(DEFAULT_VERSION);
        expect([testCase.cwd, unquotedName]).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
        expect([testCase.cwd, unquotedName]).toHaveJsonWithTags(DEFAULT_TAGS);
        expect([testCase.cwd, unquotedName]).toHaveJsonWithPort(DEFAULT_PORT);
      }))
      .finally(done);
  });

  describe('should support a custom version', function (done) {
    helper.runner.create()
      .addParameters({ version: '1.2.3' })
      .addParameters({ version: '"non-sever string"' })
      .addInvocation('init --version {version}')
      .addInvocation('init -v {version}')
      .forEach(helper.forEachIt(function (testCase) {
        var unquotedVersion = testCase.version.replace(/"/g, '');
        if (unquotedVersion !== testCase.version) {
          expect(testCase.stdout).toBeHelpWithError(true);
        } else {
          expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
          expect([testCase.cwd, DEFAULT_NAME]).toHaveExpectedItemsExcept();
          expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithName(DEFAULT_NAME);
          expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithVersion(unquotedVersion);
          expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
          expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithTags(DEFAULT_TAGS);
          expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithPort(DEFAULT_PORT);
        }
     }))
      .finally(done);
  });

  describe('should support a custom description', function (done) {
    helper.runner.create()
      .addParameters({ description: '""' })
      .addParameters({ description: '"A few words"' })
      .addInvocation('init --description {description}')
      .addInvocation('init -d {description}')
      .forEach(helper.forEachIt(function (testCase) {
        var unquotedDescription = testCase.desciption.replace(/"/g, '');
        expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveExpectedItemsExcept();
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithName(DEFAULT_NAME);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithVersion(DEFAULT_VERSION);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithDescription(unquotedDescription + 'x');
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithTags(DEFAULT_TAGS);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithPort(DEFAULT_PORT);
      }))
      .finally(done);
  });

  describe('should support custom tags', function (done) {
    helper.runner.create()
      .addParameters({ tag1: 'a', tag2: 'b', tags: ['a', 'b'] })
      .addParameters({ tag1: 1, tag2: '"some long tag"', tags: [1, "some long tag"] })
      .addInvocation('init --tag {tag1}')
      .addInvocation('init -t {tag1}')
      .addInvocation('init --tag {tag1} --tag {tag2}')
      .addInvocation('init -t {tag1} -t {tag2}')
      .forEach(helper.forEachIt(function (testCase) {
        var tagCount = testCase.command.split(/-t/g).length - 1;
        var tags     = testCase.tags.slice(0, tagCount);
        expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveExpectedItemsExcept();
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithName(DEFAULT_NAME);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithVersion(DEFAULT_VERSION);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithTags(tags);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithPort(DEFAULT_PORT);
      }))
      .finally(done);
  });

  describe('should support a custom port', function (done) {
    helper.runner.create()
      .addParameters({ port: 'random' })
      .addParameters({ port: 12345 })
      .addParameters({ port: 'illegal' })
      .addInvocation('init --port {port}')
      .addInvocation('init -p {port}')
      .forEach(helper.forEachIt(function (testCase) {
        if (testCase.port === 'illegal') {
          expect(testCase.stdout).toBeHelpWithError(true);
        } else {
          var port = (testCase.port === 'random') ? DEFAULT_PORT : testCase.port;
          expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
          expect([testCase.cwd, DEFAULT_NAME]).toHaveExpectedItemsExcept();
          expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithName(DEFAULT_NAME);
          expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithVersion(DEFAULT_VERSION);
          expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithDescription(DEFAULT_DESCRIPTION);
          expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithTags(DEFAULT_TAGS);
          expect([testCase.cwd, DEFAULT_NAME]).toHaveJsonWithPort(port);
        }
      }))
      .finally(done);
  });

  describe('should allow gating of features', function (done) {
    var LOOKUP = {
      npm         : 'package.json',
      bower       : 'bower.json',
      karma       : 'karma.conf.js',
      jshint      : '.jshintrc',
      gitignore   : '.gitignore',
      editorconfig: '.editorconfig'
    };

    // set a single flag in each param set
    var runner = helper.runner.create()
    var fields = Object.getOwnPropertyNames(LOOKUP);
    for (var i = 0; i < 2 * fields.length; i++) {
      var paramSet = {};
      for (var j = 0; j < fields.length; j++) {
        var field = fields[j];
        paramSet[field] = (j < fields.length) ? (j === i) : (Math.random() < 0.5);
      }
      runner.addParameters(paramSet);
    }

    // now run
    runner
      .addInvocation('init --npm {npm} --bower {bower} --karma {karma} --jshint {jshint} --gitignore {gitignore}',
        '--editorconfig {editorconfig}')
      .forEach(helper.forEachIt(function (testCase) {
        var exceptions = fields
          .filter(function testExcluded(field) {
            return !testCase[field];
          })
          .map(function decode(field) {
            return LOOKUP[field];
          });
        expect(testCase.cwd).toHaveDirectory(DEFAULT_NAME);
        expect([testCase.cwd, DEFAULT_NAME]).toHaveExpectedItemsExcept(exceptions);
      }))
      .finally(done);
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
      .getFileMatcher('bower.json', 'package.json', 'angularity.json', '.jshintrc', '.editorconfig', 'karma.conf.js',
        'app/index.html', 'app/index.js', 'app/index.scss')
  });
}

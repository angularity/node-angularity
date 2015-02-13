'use strict';
var Q      = require('q'),
    path   = require('path'),
    fs     = require('fs'),
    rimraf = require('rimraf'),
    spawn  = require('child_process').spawn;

/**
 * Shortcut to a temporary absolute path to perform integration tests.
 * @type {*|String}
 */
var testPath = path.resolve(__dirname, '..', 'test-temp');

/**
 * Shortcut to create a temporary test path based on name.
 * @param folderName
 * @returns {*|string}
 */
function resolveTestTempPath(folderName) {
  var testTempPath = path.join(testPath, String(folderName));

  if (!fs.existsSync(testPath))
    fs.mkdirSync(testPath);

  if (!fs.existsSync(testTempPath))
    fs.mkdirSync(testTempPath);

  return testTempPath;
}

/**
 * Shortcut to delete all the content of the testPath folder.
 */
function cleanTestTemp() {
  rimraf.sync(testPath);
}

/**
 * Shortcut to run multiple global angularity commands,
 * given multiple argument arrays, multiple processes will run in parallel.
 * The resolve value of the promise is an array of the process result objects.
 * @example helper.runAngularityAlias(['-h', '--help'])
 * @param aliases
 * @param config
 * @returns {promise}
 */
function runAngularityAlias(aliases, config) {
  var deferred = Q.defer();

  var aliased = [];
  aliases.forEach(function (args) {
    aliased.push(runAngularity(args, config));
  });

  Q.all(aliased)
    .then(function (results) {
      deferred.resolve(results);
    });

  return deferred.promise;
}

/**
 * Shortcut to run the global angularity command.
 * The promise will resolve with an object containing the
 * process exit code, stdout, stderr.
 * @example helper.runAngularity('build')
 * @param args
 * @param config
 * @returns {promise}
 */
function runAngularity(args, config) {
  var deferred = Q.defer();

  var stdout = '',
      stderr = '';

  var angularityProcess = runAngularityProcess(args, config);

  angularityProcess.stdout.on('data', function (data) {
    stdout += data;
  });

  angularityProcess.stderr.on('data', function (data) {
    stderr += data;
  });

  angularityProcess.on('exit', function (code) {
    deferred.resolve({
      args  : args,
      code  : code,
      stdout: stdout,
      stderr: stderr
    });
  });

  return deferred.promise;
}

/**
 * Shortcut to run the global angularity command.
 * Specify an array of strings or a singular string
 * for the arguments of the process.
 * @param args
 * @param config
 * @returns {*}
 */
function runAngularityProcess(args, config) {
  args = args || [];
  if (typeof args === 'string') {
    args = [args];
  }
  if (config) {
    config.cwd = config.cwd || __dirname;
  }

  var angularity = spawn('angularity', args, config);
  angularity.stdout.setEncoding('utf8');

  return angularity;
}

module.exports = {
  testPath           : testPath,
  cleanTestTemp      : cleanTestTemp,
  resolveTestTempPath: resolveTestTempPath,
  runAngularity      : runAngularity,
  runAngularityAlias : runAngularityAlias
};
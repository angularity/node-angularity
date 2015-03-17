'use strict';
var Q            = require('q'),
    path         = require('path'),
    fs           = require('fs'),
    rimraf       = require('rimraf'),
    cp           = require('shelljs').cp,
    childProcess = require('child_process');

/**
 * Shortcut to a temporary absolute path to perform integration tests.
 * @type {*|String}
 */
var testPath = path.resolve(__dirname, '..', 'test-temp');

/**
 * Shortcut to resolve the absolute path to the expected files for integration tests.
 * @param folderName
 * @returns {*}
 */
function expectedFolder(folderName) {
  var folderPath = path.resolve(__dirname, '..', 'expected', folderName);

  if (!fs.existsSync(folderPath)) {
    console.error('helper.folderPath() the folderName', folderName, 'is not located in', folderPath);
  }

  return folderPath;
}

/**
 * Shortcut to create a temporary test path based on name.
 * @param folderName
 * @returns {*|string}
 */
function resolveTestTempPath(folderName) {
  var testTempPath = path.join(testPath, String(folderName));

  if (!fs.existsSync(testPath)) {
    fs.mkdirSync(testPath);
  }

  if (!fs.existsSync(testTempPath)) {
    fs.mkdirSync(testTempPath);
  }

  return testTempPath;
}

/**
 * Shortcut to delete all the content of the testPath folder.
 */
function cleanTestTemp(done) {
  rimraf(testPath, function () {
    done();
  });
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

  runAngularityProcess(args, config, processCallback);

  function processCallback(error, stdout, stderr) {
    var code;
    if (error === null) {
      code = 0;
    } else {
      code = error.code;
    }

    var result = {
      args  : args,
      code  : code,
      stdout: stdout,
      stderr: stderr
    };

    deferred.resolve(result);
  }

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
function runAngularityProcess(args, config, callback) {
  config = config || {};
  args = args || [];
  if (typeof args === 'string') {
    args = [args];
  }

  var command = 'angularity ' + args.join(' ');

  childProcess.exec(command, config, callback);
}

/**
 * Shortcut to copy the expected project recursively and remove a specific folder recursivley
 * Workarounds with rimraf async were necessary for windows.
 * //TODO Ideally we want to reduce these dependencies while still being cross platform.
 *
 * @param done callback for when the rimraf is completed
 * @param sourceFolder the expected target folder to copy
 * @param targetFolder the target folder to remove
 * @param destinationPath the destination path for the project to be copied to
 */
function prepareExpectedDir(done, souceFolder, targetFolder, destinationPath) {
  rimraf(path.join(souceFolder, targetFolder), function () {
    cp('-Rf', destinationPath + '/*', souceFolder);
    rimraf(path.join(souceFolder, targetFolder), function () {
      done();
    });
  });
}

module.exports = {
  testPath           : testPath,
  cleanTestTemp      : cleanTestTemp,
  prepareExpectedDir : prepareExpectedDir,
  expectedFolder     : expectedFolder,
  resolveTestTempPath: resolveTestTempPath,
  runAngularity      : runAngularity,
  runAngularityAlias : runAngularityAlias
};
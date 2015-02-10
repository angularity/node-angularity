'use strict';
var Q = require('q');
var spawn = require('child_process').spawn;

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
  runAngularity: runAngularity,
  runAngularityAlias: runAngularityAlias
};
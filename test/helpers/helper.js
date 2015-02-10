'use strict';
var Q = require('q');
var spawn = require('child_process').spawn;

function runAngularityProcess(args, cwd) {
  args = args || [];
  cwd = cwd || __dirname;

  var angularity = spawn('angularity', args, {cwd: cwd});
  angularity.stdout.setEncoding('utf8');

  return angularity;
}

function runAngularity(args, cwd) {
  var deferred = Q.defer();

  var stdout = '',
      stderr = '';

  var angularityProcess = runAngularityProcess(args, cwd);

  angularityProcess.stdout.on('data', function (data) {
    stdout += data;
  });

  angularityProcess.stderr.on('data', function (data) {
    stderr += data;
  });

  angularityProcess.on('exit', function (code) {
    deferred.resolve({
      code: code,
      stdout: stdout,
      stderr: stderr
    });
  });

  return deferred.promise;
}

module.exports = {
  runAngularity: runAngularity
};
'use strict';
var spawn = require('child_process').spawn;

var helper = {};

helper.runAngularity = function (args, cwd) {
  args = args || [];
  cwd = cwd || __dirname;

  var angularity = spawn('angularity', args, {cwd: cwd});
  angularity.stdout.setEncoding('utf8');

  return angularity;
};

module.exports = helper;
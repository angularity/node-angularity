'use strict';

var yargs = require('yargs');
var config = require('../lib/config/config');

var args = yargs
  .describe('p', 'Define a port number when serving files')
  .alias('p', 'port')
  .default('p', config.getServerHttpPort())
  .describe('v', 'Display version number')
  .alias('v', 'version')
  .boolean('v')
  .describe('n', 'Name of the project to create or work on')
  .alias('n', 'name')
  .string('n')
  .usage('Angularity is an opinionated build tool for AngularJs projects.')
  .wrap(config.getConsoleWidth());
module.exports = args;

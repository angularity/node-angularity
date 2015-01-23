var yargs = require('yargs');
var args = yargs
  .describe('p', 'Define a port number when serving files')
  .alias('p', 'port')
  .default('p', 10101)
  .describe('v', 'Version number')
  .alias('v', 'version')
  .boolean('v')
  .usage()
  .wrap(80);
module.exports = yargs;

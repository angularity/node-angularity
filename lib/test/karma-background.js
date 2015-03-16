/**
 * Original credit to Larry Davis
 * https://github.com/lazd/gulp-karma
 */
var server  = require('karma').server;
var decoded = require('querystring').unescape(process.argv[2]);
var data    = JSON.parse(decoded);
server.start(data);
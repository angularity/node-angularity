var path = require('path');

var compileTargets = {
  ES5: 'ES5',
  ES6: 'ES6'
};

var angularityVersion = require(path.join(__dirname, '..', '..', 'package.json')).version;

var projectConfig = {
  name                  : 'angularity-project',
  version               : '0.0.1',
  serverHttpPort        : Math.floor(Math.random() * 9000) + 1000,
  consoleWidth          : 80,
  javascriptVersion     : compileTargets.ES6,
  angularityVersion     : angularityVersion,
  webstormExecutablePath: ''
};

var globalConfig = {
  serverHttpPort        : 1419,
  consoleWidth          : 80,
  javascriptVersion     : compileTargets.ES6,
  webstormExecutablePath: ''
};

module.exports = {
  projectConfig : projectConfig,
  globalConfig  : globalConfig,
  compileTargets: compileTargets,
  angularityVersion: angularityVersion
};
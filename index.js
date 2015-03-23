'use strict';
var path            = require('path');

var gulp            = require('gulp');
var pluginRegistry  = require('plugin-registry');

var taskYargsRun    = require('./lib/util/task-yargs-run');

var defaultTaskPlugins = [
  'html',
  'css',
  'javascript',
  'test',
  'build',
  'release',
  'server',
  'watch',
  'init',
  'webstorm'
].map(function parseDefaultPluginDefinition(taskName) {
  return {
    name: taskName,
    requirePath: path.resolve(__dirname, 'tasks', taskName),
    category: 'task',
    isDefault: true
  };
});

var angularityJson;
try {
  angularityJson = require(path.resolve('angularity.json'));
}
catch (ex) {
  // Do nothing
}
var configTaskPlugins = (angularityJson && angularityJson.plugins) || [];
if (configTaskPlugins.constructor !== Array) {
  throw new Error('Plugins defined in angularity.json should be an array');
}

var pluginOptions = {
  projectPath: __dirname,
  gulp: gulp,
  taskYargsRun: taskYargsRun
};

pluginRegistry
  .get('angularity')
  .options(pluginOptions)
  .add(defaultTaskPlugins)
  .add(configTaskPlugins);

var taskPlugins = pluginRegistry
  .get('angularity')
  .getAllOfCategory('task');

taskPlugins
  .forEach(function eachTaskPlugin(pluginDefinition) {
    var plugin = require(pluginDefinition.requirePath);

    // Task plugins are expected to export a function which should be called with an instance of taskYargsRun
    if (typeof plugin !== 'function') {
      throw new Error('Plugin named ' + pluginDefinition.name + ' does not export a function');
    }

    plugin(pluginOptions);
  });

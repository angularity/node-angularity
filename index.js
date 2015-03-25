'use strict';
var path            = require('path');

var gulp            = require('gulp'),
    runSequence     = require('run-sequence'),
    pluginRegistry  = require('plugin-registry');

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

var pluginContext = {
  toolPath: __dirname
};

pluginRegistry
  .get('angularity')
  .context(pluginContext)
  .add(defaultTaskPlugins)
  .add(configTaskPlugins);

pluginRegistry
  .get('angularity')
  .getAllOfCategory('task')
  .forEach(function eachTaskPlugin(definition) {
    var plugin = definition.plugin;

    // Task plugins are expected to export a function which should be called with an instance of taskYargsRun
    if (typeof plugin !== 'function') {
      throw new Error('Plugin named ' + definition.name + ' does not export a function');
    }

    var taskDefinition = plugin({
      taskYargsRun: taskYargsRun,
      gulp: gulp,
      runSequence: runSequence
    });
    taskYargsRun.taskYargs.register(taskDefinition);
  });

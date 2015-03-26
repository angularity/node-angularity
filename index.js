'use strict';
var path            = require('path');

var pluginRegistry  = require('plugin-registry');

var taskYargsRun    = require('./lib/util/task-yargs-run');

var defaultTaskPlugins = [
  'html',
  'css',
  'javascript',
  'test',
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

defaultTaskPlugins = defaultTaskPlugins.concat([
  'angularity-build-task'
]);

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

pluginRegistry
  .get('angularity')
  .context({})
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
      getDependency: function getContextDependency(name) {
        switch(name) {
          case 'hr':
            return require('./lib/util/hr');
          case 'gulp':
            return require('gulp');
          case 'runSequence':
            return require('run-sequence');
          case 'taskYargsRun':
            return taskYargsRun;
          default:
            throw new Error('Context dependency ' + name + ' is unknown');
        }
      },
      taskYargsRun: taskYargsRun,
      gulp: require('gulp'),
      runSequence: require('run-sequence')
    });
    taskYargsRun.taskYargs.register(taskDefinition);
  });

'use strict';

function setUpTaskBuild(tyRun) {
  var taskDefinition = {
    name: 'build',
    description: ('The "build" task performs a single build of the javascript and SASS composition root(s).'),
    prerequisiteTasks: ['help', 'javascript', 'css', 'html'],
    checks: [],
    options: [],
    onInit: function onBuildTask(yargsInstance) {
      var cliArgs = yargsInstance
        .strict()
        .wrap(80)
        .argv;

      var gulp        = require('gulp'),
          wordwrap    = require('wordwrap'),
          runSequence = require('run-sequence');

      var taskYargs       = require('../lib/util/task-yargs'),
          hr              = require('../lib/util/hr');

      gulp.task('build', function (done) {
        console.log(hr('-', 80, 'build'));
        runSequence('javascript', 'css', 'html', done);
      });
    },
    onRun: function onBuildTask(yargsInstance) {
      var runSequence = require('run-sequence');
      runSequence(taskDefinition.name);
    }
  }

  tyRun.taskYargs.register(taskDefinition);
}

module.exports = setUpTaskBuild;

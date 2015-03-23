'use strict';

function setUpTaskBuild(options) {
  var taskDefinition = {
    name: 'build',
    description: ('The "build" task performs a single build of the javascript and SASS composition root(s).'),
    prerequisiteTasks: ['help', 'javascript', 'css', 'html'],
    checks: [],
    options: [],
    onInit: function onBuildTask() {
      var gulp        = options.gulp || require('gulp'),
          runSequence = require('run-sequence');

      var hr          = require('../lib/util/hr');

      gulp.task('build', function (done) {
        console.log(hr('-', 80, 'build'));
        runSequence('javascript', 'css', 'html', done);
      });
    },
    onRun: function onBuildTask() {
      var gulp        = options.gulp || require('gulp');
      gulp.run(taskDefinition.name);
    }
  };

  options.taskYargsRun.taskYargs.register(taskDefinition);
}

module.exports = setUpTaskBuild;

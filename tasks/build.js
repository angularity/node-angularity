'use strict';

function setUpTaskBuild(context) {
  if (!context.gulp) {
    throw new Error('Context must specify gulp instance');
  }
  if (!context.runSequence) {
    throw new Error('Context must specify run-sequence instance');
  }

  var taskDefinition = {
    name: 'build',
    description: ('The "build" task performs a single build of the javascript and SASS composition root(s).'),
    prerequisiteTasks: ['help', 'javascript', 'css', 'html'],
    checks: [],
    options: [],
    onInit: function onBuildTask() {
      var gulp        = context.gulp,
          runSequence = context.runSequence;

      var hr          = require('../lib/util/hr');

      gulp.task('build', function (done) {
        console.log(hr('-', 80, 'build'));
        runSequence('javascript', 'css', 'html', done);
      });
    },
    onRun: function onBuildTask() {
      var gulp        = context.gulp;
      gulp.start(taskDefinition.name);
    }
  };

  return taskDefinition;
}

module.exports = setUpTaskBuild;

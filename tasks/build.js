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
    description: [
      'The "build" task performs a single build of the javascript and SASS composition root(s) and also bundles all ' +
      '.spec.js files in the project.',
      '',
      'This task generates a karma.conf.js so that you may use an external karma test runner. You therefore have the ' +
      'ability to specify a karma reporter, even though you are not running the tests.',
      '',
      'Examples:',
      '',
      'angularity build        Run this task',
      'angularity build -u     Run this task but do not minify javascript'
    ].join('\n'),
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

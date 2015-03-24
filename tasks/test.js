'use strict';

function setUpTaskTest(tyRun) {
  var taskDefinition = {
    name: 'test',
    description: [
      'The "test" task performs a one time build and karma test of all .spec.js files in the project.',
      '',
      'Examples:',
      '',
      'angularity test    Run this task'
    ].join('\n'),
    prerequisiteTasks: ['javascript'],
    options: [],
    checks: [],
    onInit: function onInitTestTask(yargsInstance) {
      var gulp    = require('gulp');

      var karma   = require('../lib/test/karma'),
          hr      = require('../lib/util/hr'),
          streams = require('../lib/config/streams');

      var cliArgs;
      cliArgs = yargsInstance
        .strict()
        .wrap(80)
        .argv;

      gulp.task('test', ['javascript'], function () {
        console.log(hr('-', 80, 'test'));

        gulp
          .src(streams.TEST + '/karma.conf.js')
          .pipe(karma.run());
      });
    },
    onRun: function onRunTestTask() {
      var runSequence = require('run-sequence');
      runSequence(taskDefinition.name);
    }
  };
  tyRun.taskYargs.register(taskDefinition);
}

module.exports = setUpTaskTest;

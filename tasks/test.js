'use strict';

function setUpTaskTest(options) {
  var taskDefinition = {
    name: 'test',
    description: [
      'The "test" task performs a one time build and ' +
        'karma test of all .spec.js files in the project.',
      '',
      'angularity test', 'Run this task'
    ].join('\n'),
    prerequisiteTasks: ['javascript'],
    options: [],
    checks: [],
    onInit: function onInitTestTask(yargsInstance) {
      var gulp            = options.gulp || require('gulp');

      var karma           = require('../lib/test/karma'),
          hr              = require('../lib/util/hr'),
          streams         = require('../lib/config/streams');

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
      var gulp        = options.gulp || require('gulp');
      gulp.run(taskDefinition.name);
    }
  };
  options.taskYargsRun.taskYargs.register(taskDefinition);
}

module.exports = setUpTaskTest;

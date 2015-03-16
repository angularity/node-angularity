'use strict';

function setUpTaskTest(tyRun) {
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
      var path            = require('path'),
          fs              = require('fs');

      var gulp            = require('gulp'),
          jshint          = require('gulp-jshint'),
          rimraf          = require('gulp-rimraf'),
          runSequence     = require('run-sequence'),
          combined        = require('combined-stream'),
          to5ify          = require('6to5ify'),
          stringify       = require('stringify'),
          wordwrap        = require('wordwrap'),
          ngAnnotate      = require('browserify-ngannotate');

      var karma           = require('../lib/test/karma'),
          browserify      = require('../lib/build/browserify'),
          taskYargs       = require('../lib/util/task-yargs'),
          hr              = require('../lib/util/hr'),
          streams         = require('../lib/config/streams'),
          jshintReporter  = require('../lib/util/jshint-reporter');

      var cliArgs;
      cliArgs = yargsInstance
        .strict()
        .wrap(80)
        .argv;

      gulp.task('test', ['javascript'], function (done) {
        console.log(hr('-', 80, 'javascript'));

        gulp
          .src(streams.TEST + '/karma.conf.js')
          .pipe(karma.run());
      });
    },
    onRun: function onRunTestTask(yargsInstance) {
      var runSequence = require('run-sequence');
      runSequence(taskDefinition.name);
    }
  };
  tyRun.taskYargs.register(taskDefinition);
}

module.exports = setUpTaskTest;

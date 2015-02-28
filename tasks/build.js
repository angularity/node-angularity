'use strict';

var gulp        = require('gulp'),
    wordwrap    = require('wordwrap'),
    runSequence = require('run-sequence');

var taskYargs       = require('../lib/util/task-yargs'),
    hr              = require('../lib/util/hr');

taskYargs.register('build', {
  description: (wordwrap(2, 80)('The "build" task performs a single build of the javascript and SASS composition root(s).')),
  prerequisiteTasks: ['javascript' /*, 'css', 'html'*/],
  checks: [],
  options: []
});

gulp.task('build', function (done) {
  console.log(hr('-', 80, 'build'));
  runSequence('javascript', 'css', 'html', done);
});

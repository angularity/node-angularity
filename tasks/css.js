'use strict';

function setUpTaskCss(tyRun) {
  var taskDefinition = {
    name: 'css',
    description: ('The "css" task performs a one time build of the SASS composition root(s).'),
    prerequisiteTasks: ['help'],
    checks: [],
    options: [],
    onInit: function onInitCssTask(yargsInstance) {
var cliArgs = yargsInstance
  .strict()
  .wrap(80)
  .argv;

var gulp            = require('gulp'),
    rimraf          = require('gulp-rimraf'),
    runSequence     = require('run-sequence'),
    wordwrap        = require('wordwrap'),
    path            = require('path');

var nodeSass        = require('../lib/build/node-sass'),
    taskYargs       = require('../lib/util/task-yargs'),
    hr              = require('../lib/util/hr'),
    streams         = require('../lib/config/streams');

gulp.task('css', function (done) {
  console.log(hr('-', 80, 'css'));
  runSequence(
    'css:clean',
    'css:build',
    done
  );
});

// clean the css build directory
gulp.task('css:clean', function () {
  return gulp.src(streams.BUILD + '/**/*.css*', {read: false})
    .pipe(rimraf());
});

// compile sass with the previously discovered lib paths
gulp.task('css:build', function () {
  return streams.scssApp()
    .pipe(nodeSass(80, [streams.BOWER, streams.NODE]))
    .pipe(gulp.dest(streams.BUILD));
});
    },
    onRun: function onRunCssTask(yargsInstance) {
      var runSequence = require('run-sequence');
      runSequence(taskDefinition.name);
    }
  };
  tyRun.taskYargs.register(taskDefinition);
}

module.exports = setUpTaskCss;

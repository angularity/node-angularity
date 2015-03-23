'use strict';

function setUpTaskCss(options) {
  var taskDefinition = {
    name: 'css',
    description: ('The "css" task performs a one time build of the SASS composition root(s).'),
    prerequisiteTasks: ['help'],
    checks: [],
    options: [],
    onInit: function onInitCssTask() {
      var gulp            = options.gulp || require('gulp'),
          rimraf          = require('gulp-rimraf'),
          runSequence     = require('run-sequence');

      var nodeSass        = require('../lib/build/node-sass'),
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
    onRun: function onRunCssTask() {
      var gulp        = options.gulp || require('gulp');
      gulp.start.apply(gulp, [taskDefinition.name]);
    }
  };
  options.taskYargsRun.taskYargs.register(taskDefinition);
}

module.exports = setUpTaskCss;

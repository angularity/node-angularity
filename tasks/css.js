'use strict';

function setUpTaskCss(context) {
  if (!context.gulp) {
    throw new Error('Context must specify gulp instance');
  }
  if (!context.runSequence) {
    throw new Error('Context must specify run-sequence instance');
  }

  var taskDefinition = {
    name: 'css',
    description: 'The "css" task performs a one time build of the SASS composition root(s).',
    prerequisiteTasks: ['help'],
    checks: [],
    options: [],
    onInit: function onInitCssTask() {
      var gulp            = context.gulp,
          runSequence     = context.runSequence,
          rimraf          = require('gulp-rimraf');

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
      var gulp        = context.gulp;
      gulp.start(taskDefinition.name);
    }
  };

  return taskDefinition;
}

module.exports = setUpTaskCss;

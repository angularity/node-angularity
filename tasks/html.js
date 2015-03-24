'use strict';

function setUpTaskHtml(context) {
  if (!context.gulp) {
    throw new Error('Context must specify gulp instance');
  }
  if (!context.runSequence) {
    throw new Error('Context must specify run-sequence instance');
  }

  var taskDefinition = {
    name: 'html',
    description: 'The "html" task performs a one time injection of pre-built JS and CSS into the application HTML.',
    prerequisiteTasks: ['help'],
    checks: [],
    options: [],
    onInit: function onInitHtmlTask() {
      var gulp            = context.gulp,
          runSequence     = context.runSequence,
          inject          = require('gulp-inject'),
          plumber         = require('gulp-plumber'),
          rimraf          = require('gulp-rimraf');

      var injectAdjacent  = require('../lib/inject/adjacent-files'),
          bowerFiles      = require('../lib/inject/bower-files'),
          hr              = require('../lib/util/hr'),
          streams         = require('../lib/config/streams');

      // `cliArgs` are available within gulp tasks by means of closure,
      // as they are only called after `onRun` has been invoked, and they have been passed
      gulp.task('html', function (done) {
        console.log(hr('-', 80, 'html'));
        runSequence(
          'html:clean',
          ['html:inject', 'html:assets'],
          done
        );
      });

      // clean the html build directory
      gulp.task('html:clean', function () {
        return gulp.src([streams.BUILD + '/**/*.html*', streams.BUILD + '/**/assets'], { read: false })
          .pipe(rimraf());
      });

      // inject dependencies into html and output to build directory
      gulp.task('html:inject', function () {
        return streams.htmlApp()
          .pipe(plumber())
          .pipe(gulp.dest(streams.BUILD)) // put html in final directory first to get correct inject paths
          .pipe(injectAdjacent('js|css', {
            name: 'inject'
          }))
          .pipe(inject(bowerFiles().src('js|css', {read: false}), {
            name: 'bower'
          }))
          .pipe(gulp.dest(streams.BUILD));
      });

      // copy assets to build directory
      gulp.task('html:assets', function () {
        return gulp.src(streams.APP + '/**/assets/**')
          .pipe(gulp.dest(streams.BUILD));
      });
    },
    onRun: function onRunHtmlTask() {
      var gulp        = context.gulp;
      gulp.start(taskDefinition.name);
    }
  };

  return taskDefinition;
}

module.exports = setUpTaskHtml;

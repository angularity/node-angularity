'use strict';

module.exports = function htmlTask(context) {

  // protect against api change
  ['gulp', 'runSequence', 'streams'].forEach(assertField(context));

  // task definition
  return {
    name          : 'html',
    inherit       : ['help'],
    description   : 'The "html" task performs a one time injection of pre-built JS and CSS into the application HTML.',
    options       : [],
    checks        : [],
    implementation: implementation
  };

  /**
   * TODO description
   */
  function implementation() {
    var gulp        = context.gulp,
        runSequence = context.runSequence,
        streams     = context.streams;

    var inject  = require('gulp-inject'),
        plumber = require('gulp-plumber'),
        rimraf  = require('gulp-rimraf');

    var injectAdjacent = require('../lib/inject/adjacent-files'),
        bowerFiles     = require('../lib/inject/bower-files'),
        hr             = require('../lib/util/hr');

    // TODO @bguiz what does this comment mean ?
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
      return gulp.src([streams.BUILD + '/**/*.html*', streams.BUILD + '/**/assets'], {read: false})
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
  }

};

/**
 * TODO move this to package angularity-util?
 */
function assertField(context) {
  return function assertForField(field) {
    if (!context[field]) {
      throw new Error('Plugin Incompatibility: Context must specify "' + field + '"');
    }
  };
}
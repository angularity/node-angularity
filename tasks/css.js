'use strict';

module.exports = function cssTask(context) {

  // protect against api change
  ['gulp', 'runSequence', 'streams'].forEach(assertField(context));

  // task definition
  return {
    name          : 'css',
    inherit       : ['help'],
    description   : 'The "css" task performs a one time build of the SASS composition root(s).',
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

    var rimraf = require('gulp-rimraf');

    var nodeSass = require('../lib/build/node-sass'),
        hr       = require('../lib/util/hr');

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
'use strict';

module.exports = function releaseTask(context) {

  // protect against api change
  ['gulp', 'runSequence', 'streams'].forEach(assertField(context));

  return {
    name          : 'release',
    inherit       : ['help', 'build'],
    description   : [
      'The "release" task performs a single build and exports the build files along with bower components ' +
      'to a release directory.',
      '',
      'This task inherits from build and so while you have the ability to specify a karma reporter it is superfluous ' +
      'in the context of release.',
      '',
      'Examples:',
      '',
      'angularity release        Run this task',
      'angularity release -u     Run this task but do not minify javascript'
    ].join('\n'),
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

    var inject   = require('gulp-inject'),
        plumber  = require('gulp-plumber'),
        rimraf   = require('gulp-rimraf'),
        semiflat = require('gulp-semiflat');

    var injectAdjacent  = require('../lib/inject/adjacent-files'),
        injectTransform = require('../lib/inject/relative-transform'),
        bowerFiles      = require('../lib/inject/bower-files'),
        hr              = require('../lib/util/hr');

    gulp.task('release', ['build'], function (done) {
      console.log(hr('-', 80, 'release'));
      runSequence(
        'release:clean',
        'release:adjacent',
        'release:inject',
        done
      );
    });

    // clean the html build directory
    gulp.task('release:clean', function () {
      return gulp.src([streams.RELEASE_BUNDLE, streams.RELEASE_VENDOR], {read: false})
        .pipe(rimraf());
    });

    gulp.task('release:adjacent', function () {
      return gulp.src([streams.BUILD + '/*.js*', streams.BUILD + '/*.css*', streams.BUILD + '/assets/**'])
        .pipe(semiflat(streams.BUILD))
        .pipe(gulp.dest(streams.RELEASE_BUNDLE));
    });

    // inject dependencies into html and output to build directory
    gulp.task('release:inject', function() {
      function bower() {
        return bowerFiles()
          .src('*', { base: true, manifest: true })
          .pipe(gulp.dest(streams.RELEASE_VENDOR));
      }
      return gulp.src([streams.APP + '/*.html'])
        .pipe(plumber())
        .pipe(gulp.dest(streams.RELEASE_BUNDLE))  // put html in final directory first to get correct inject paths
        .pipe(injectAdjacent('js|css', {
          name     : 'inject',
          transform: injectTransform
        }))
        .pipe(inject(bower(), {
          name     : 'bower',
          transform: injectTransform
        }))
        .pipe(gulp.dest(streams.RELEASE_BUNDLE));
    });

    // version the release app directory
    /* TODO resolve visioning and CDN release
    gulp.task('release:versionapp', function () {
      return gulp.src(streams.RELEASE_APP + '/**')
        .pipe(versionDirectory('$', true));
    });
    */
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
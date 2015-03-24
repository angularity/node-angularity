'use strict';

function setUpTaskRelease(context) {
  if (!context.gulp) {
    throw new Error('Context must specify gulp instance');
  }
  if (!context.runSequence) {
    throw new Error('Context must specify run-sequence instance');
  }

  var taskDefinition = {
    name: 'release',
    description: [
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
    prerequisiteTasks: ['help', 'build'],
    checks: [],
    options: [],
    onInit: function onInitReleaseTask() {
      var gulp        = context.gulp,
          runSequence = context.runSequence,
          inject      = require('gulp-inject'),
          plumber     = require('gulp-plumber'),
          rimraf      = require('gulp-rimraf'),
          semiflat    = require('gulp-semiflat');

      var injectAdjacent   = require('../lib/inject/adjacent-files'),
          injectTransform  = require('../lib/inject/relative-transform'),
          bowerFiles       = require('../lib/inject/bower-files'),
          hr               = require('../lib/util/hr'),
          streams          = require('../lib/config/streams');

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
    },
    onRun: function onRunReleaseTask() {
      var gulp        = context.gulp;
      gulp.start(taskDefinition.name);
    }
  };

  return taskDefinition;
}

module.exports = setUpTaskRelease;

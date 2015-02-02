'use strict';

var gulp        = require('gulp'),
    concat      = require('gulp-concat'),
    wrap        = require('gulp-wrap'),
    inject      = require('gulp-inject'),
    plumber     = require('gulp-plumber'),
    rimraf      = require('gulp-rimraf'),
    semiflat    = require('gulp-semiflat'),
    wordwrap    = require('wordwrap'),
    runSequence = require('run-sequence');

var injectAdjacent   = require('../lib/inject/adjacent-files'),
    injectTransform  = require('../lib/inject/relative-transform'),
    bowerFiles       = require('../lib/inject/bower-files'),
    versionDirectory = require('../lib/release/version-directory'),
    yargs            = require('../lib/util/yargs'),
    hr               = require('../lib/util/hr'),
    streams          = require('../lib/config/streams');

yargs.getInstance('release')
  .usage(wordwrap(2, 80)('The "release" task performs a single build and exports the build files along with bower ' +
    'components to a release directory.'))
  .example('$0 release', 'Run this task')
  .example('$0 release -n', 'Run this task but do not minify built javascript')
  .options('help', {
    describe: 'This help message',
    alias   : [ 'h', '?' ],
    boolean : true
  })
  .options('unminified', {
    describe: 'Inhibit minification of javascript',
    alias   : 'u',
    boolean : true,
    default : false
  })
  .strict()
  .check(yargs.subCommandCheck)
  .wrap(80);

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
/* TODO resolve versioning and CDN release
gulp.task('release:versionapp', function () {
  return gulp.src(streams.RELEASE_APP + '/**')
    .pipe(versionDirectory('$', true));
});
*/

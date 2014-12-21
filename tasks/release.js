'use strict';

var gulp        = require('gulp'),
    concat      = require('gulp-concat'),
    wrap        = require('gulp-wrap'),
    inject      = require('gulp-inject'),
    plumber     = require('gulp-plumber'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence'),
    combined    = require('combined-stream');

var injectAdjacent   = require('../lib/inject/adjacent-files'),
    injectTransform  = require('../lib/inject/relative-transform'),
    bowerFiles       = require('../lib/inject/bower-files'),
    versionDirectory = require('../lib/release/version-directory'),
    angularity       = require('../index');

gulp.task('release', ['build'], function (done) {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'release'));
  runSequence(
    'release:clean',
    'release:adjacent',
    'release:inject',
    done
  );
});

// clean the html build directory
gulp.task('release:clean', function () {
  return gulp.src(angularity.RELEASE, {read: false})
    .pipe(rimraf());
});

gulp.task('release:adjacent', function () {
  return combined.create()
    .append(gulp.src([angularity.JS_BUILD + '/**/*.js', '!**/dev/**', '!**/test**']))
    .append(gulp.src([angularity.CSS_BUILD + '/**/*.css', '!**/dev/**', '!**/test**']))
    .append(gulp.src([angularity.HTML_SRC + '/**/*.html', '!**/dev/**', '!**/partials/**']))
    .append(gulp.src([angularity.HTML_SRC + '/**/assets/**']))
    .pipe(gulp.dest(angularity.RELEASE_APP));
});

// inject dependencies into html and output to build directory
gulp.task('release:inject', function() {
  var bower = bowerFiles()
    .src('*', { base: true, manifest: true })
    .pipe(gulp.dest(angularity.RELEASE_LIB));
  return gulp.src([ angularity.RELEASE_APP + '/**/*.html', '!**/dev/**' ])
    .pipe(plumber())
    .pipe(injectAdjacent('js|css', angularity.RELEASE_APP, {
      name: 'inject',
      transform: injectTransform
    }))
    .pipe(inject(bower, {
      name: 'bower',
      transform: injectTransform
    }))
    .pipe(gulp.dest(angularity.RELEASE_APP));
});

// version the release app directory
/* TODO resolve versioning and CDN release
gulp.task('release:versionapp', function () {
  return gulp.src(angularity.RELEASE_APP + '/**')
    .pipe(versionDirectory('$', true));
});
*/

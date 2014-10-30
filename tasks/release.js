'use strict';

var gulp = require('gulp');
var concat = require('gulp-concat');
var wrap = require('gulp-wrap');
var inject = require('gulp-inject');
var plumber = require('gulp-plumber');
var rimraf = require('gulp-rimraf');
var runSequence = require('run-sequence');
var combined = require('combined-stream');

var injectAdjacent = require('../lib/inject/adjacent-files');
var injectTransform = require('../lib/inject/relative-transform');
var versionDirectory = require('../lib/release/version-directory');
var angularity = require('../index');

// RELEASE ---------------------------------
gulp.task('release', ['build'], function (done) {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'release'));
  runSequence(
    'release:clean',
    ['release:adjacent', 'release:bower'],
    'release:versionlib',
    'release:inject',
    'release:versionapp',
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

// copy bower main elements to versioned directories in release
gulp.task('release:bower', function () {
  return angularity.bowerStream({manifest: true})
    .pipe(wrap([
      '/* ' + angularity.hr('-', 114),
      ' * <%= file.relative %>',
      ' * ' + angularity.hr('-', 114) + ' */',
      '<%= contents %>'
    ].join('\n')))
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest(angularity.RELEASE_LIB));
});

// version the release app directory
gulp.task('release:versionlib', function () {
  return gulp.src(angularity.RELEASE_LIB + '/**')
    .pipe(versionDirectory('$', true));
});

// inject dependencies into html and output to build directory
gulp.task('release:inject', function () {
  return gulp.src([angularity.RELEASE_APP + '/**/*.html', '!**/dev/**'])
    .pipe(plumber())
    .pipe(injectAdjacent('js|css', angularity.RELEASE_APP, {
      name     : 'inject',
      transform: injectTransform
    }))
    .pipe(inject(gulp.src(angularity.RELEASE_LIB.replace('$', '*') + '/**', {read: false}), {
      name     : 'bower',
      transform: injectTransform
    }))
    .pipe(gulp.dest(angularity.RELEASE_APP));
});

// version the release app directory
gulp.task('release:versionapp', function () {
  return gulp.src(angularity.RELEASE_APP + '/**')
    .pipe(versionDirectory('$', true));
});

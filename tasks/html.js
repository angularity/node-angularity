'use strict';

var gulp        = require('gulp'),
    concat      = require('gulp-concat'),
    inject      = require('gulp-inject'),
    minifyHtml  = require('gulp-minify-html'),
    ngHtml2js   = require('gulp-ng-html2js'),
    plumber     = require('gulp-plumber'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence');

var injectAdjacent = require('../lib/inject/adjacent-files'),
    angularity     = require('../index');

gulp.task('html', function (done) {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'html'));
  runSequence(
    'html:clean',
    ['html:partials', 'html:assets'],
    'html:inject',
    done
  );
});

// clean the html build directory
gulp.task('html:clean', function () {
  return gulp.src([angularity.HTML_BUILD + '/**/*.html*', angularity.HTML_BUILD + '/**/assets/**'], {read: false})
    .pipe(rimraf());
});

// convert partials into template js
gulp.task('html:partials', function () {
  return angularity.htmlPartialsSrcStream()
    .pipe(plumber())
    .pipe(minifyHtml({
      empty : true,
      spare : true,
      quotes: true
    }))
    .pipe(ngHtml2js({
      moduleName: angularity.PARTIALS_NAME
    }))
    .pipe(concat(angularity.PARTIALS_NAME + '.html.js'))
    .pipe(gulp.dest(angularity.JS_BUILD));
});

// copy assets to build directory
gulp.task('html:assets', function () {
  return gulp.src(angularity.HTML_SRC + '/**/assets/**')
    .pipe(gulp.dest(angularity.HTML_BUILD));
});

// inject dependencies into html and output to build directory
gulp.task('html:inject', function () {
  return angularity.htmlAppSrcStream()
    .pipe(plumber())
    .pipe(injectAdjacent('js', angularity.JS_BUILD))
    .pipe(injectAdjacent('css', angularity.CSS_BUILD))
    .pipe(inject(angularity.bowerStream({read: false}), {
      name: 'bower'
    }))
    .pipe(gulp.dest(angularity.HTML_BUILD));
});
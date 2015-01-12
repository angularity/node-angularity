'use strict';

var gulp        = require('gulp'),
    concat      = require('gulp-concat'),
    inject      = require('gulp-inject'),
    minifyHtml  = require('gulp-minify-html'),
    ngHtml2js   = require('gulp-ng-html2js'),
    plumber     = require('gulp-plumber'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence');

var config         = require('../lib/config/config'),
    injectAdjacent = require('../lib/inject/adjacent-files'),
    bowerFiles     = require('../lib/inject/bower-files'),
    hr             = require('../lib/util/hr'),
    streams        = require('../lib/config/streams');

var CONSOLE_WIDTH = config.getConsoleWidth();

gulp.task('html', function (done) {
  console.log(hr('-', CONSOLE_WIDTH, 'html'));
  runSequence(
    'html:clean',
    ['html:partials', 'html:assets'],
    'html:inject',
    done
  );
});

// clean the html build directory
gulp.task('html:clean', function () {
  return gulp.src([streams.HTML_BUILD + '/**/*.html*', streams.HTML_BUILD + '/**/assets/**'], {read: false})
    .pipe(rimraf());
});

// convert partials into template js
gulp.task('html:partials', function () {
  return streams.htmlPartialsSrcStream()
    .pipe(plumber())
    .pipe(minifyHtml({
      empty : true,
      spare : true,
      quotes: true
    }))
    .pipe(ngHtml2js({
      moduleName: streams.PARTIALS_NAME
    }))
    .pipe(concat(streams.PARTIALS_NAME + '.html.js'))
    .pipe(gulp.dest(streams.JS_BUILD));
});

// copy assets to build directory
gulp.task('html:assets', function () {
  return gulp.src(streams.HTML_SRC + '/**/assets/**')
    .pipe(gulp.dest(streams.HTML_BUILD));
});

// inject dependencies into html and output to build directory
gulp.task('html:inject', function () {
  return streams.htmlAppSrcStream()
    .pipe(plumber())
    .pipe(injectAdjacent('js', streams.JS_BUILD))
    .pipe(injectAdjacent('css', streams.CSS_BUILD))
    .pipe(inject(bowerFiles().src(/^(js|css)$/, {read: false}), {
      name: 'bower'
    }))
    .pipe(gulp.dest(streams.HTML_BUILD));
});
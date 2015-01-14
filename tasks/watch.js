'use strict';

var gulp          = require('gulp'),
    watch         = require('gulp-watch'),
    watchSequence = require('gulp-watch-sequence');

var config  = require('../lib/config/config'),
    hr      = require('../lib/util/hr'),
    streams = require('../lib/config/streams');

var CONSOLE_WIDTH = config.getConsoleWidth();

gulp.task('watch', ['server'], function () {

  // enqueue actions to avoid multiple trigger
  var queue = watchSequence(500, function () {
    console.log(hr('\u2591', CONSOLE_WIDTH));
  });

  // watch statements
  watch([
    streams.JS_LIB_BOWER + '/**/*.js',
    streams.JS_LIB_LOCAL + '/**/*.js',
    streams.JS_SRC + '/**/*.js'
  ], {
    name      : 'JS',
    emitOnGlob: false
  }, queue.getHandler('js', 'html', 'reload')); // html will be needed in case previous injection failed

  watch([
    streams.CSS_LIB_BOWER + '/**/*.scss',
    streams.CSS_LIB_LOCAL + '/**/*.scss',
    streams.CSS_SRC + '/**/*.scss'
  ], {
    name      : 'CSS',
    emitOnGlob: false
  }, queue.getHandler('css', 'html', 'reload')); // html will be needed in case previous injection failed

  watch([
    streams.BOWER + '/**/*',
    streams.HTML_SRC + '/**/*.html'
  ], {
    name      : 'HTML | BOWER',
    emitOnGlob: false
  }, queue.getHandler('html', 'reload'));
});
'use strict';

var gulp          = require('gulp'),
    watch         = require('gulp-watch'),
    watchSequence = require('gulp-watch-sequence');

var angularity = require('../index');

// WATCH ---------------------------------
gulp.task('watch', ['server'], function () {

  // enqueue actions to avoid multiple trigger
  var queue = watchSequence(500, function () {
    console.log(angularity.hr('\u2591', angularity.CONSOLE_WIDTH));
  });

  // watch statements
  watch([
    angularity.JS_LIB_BOWER + '/**/*.js',
    angularity.JS_LIB_LOCAL + '/**/*.js',
    angularity.JS_SRC + '/**/*.js'
  ], {
    name      : 'JS',
    emitOnGlob: false
  }, queue.getHandler('js', 'html', 'reload')); // html will be needed in case previous injection failed

  watch([
    angularity.CSS_LIB_BOWER + '/**/*.scss',
    angularity.CSS_LIB_LOCAL + '/**/*.scss',
    angularity.CSS_SRC + '/**/*.scss'
  ], {
    name      : 'CSS',
    emitOnGlob: false
  }, queue.getHandler('css', 'html', 'reload')); // html will be needed in case previous injection failed

  watch([
    angularity.BOWER + '/**/*',
    angularity.HTML_SRC + '/**/*.html'
  ], {
    name      : 'HTML | BOWER',
    emitOnGlob: false
  }, queue.getHandler('html', 'reload'));
});
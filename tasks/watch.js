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
  watch(streams.getGlob(['**/*.js', '**/*.html', '!*.*', '!**/*.spec.*'], [streams.APP, streams.NODE, streams.BOWER]), {
    name      : 'JS|HTML',
    emitOnGlob: false
  }, queue.getHandler('js', 'html', 'reload')); // app html will be needed in case previous injection failed

  watch(streams.getGlob(['**/*.scss', '!*.scss'], [streams.APP, streams.NODE, streams.BOWER]), {
    name      : 'CSS',
    emitOnGlob: false
  }, queue.getHandler('css', 'html', 'reload')); // html will be needed in case previous injection failed

  watch([streams.BOWER + '/**/*', '!**/*.js', '!**/*.scss'], {  // don't conflict with JS or CSS
    name      : 'BOWER',
    emitOnGlob: false
  }, queue.getHandler('html', 'reload'));

  watch(streams.getGlob(['**/*.spec.js', '!*.spec.js']), {
    name      : 'TEST',
    emitOnGlob: false
  }, queue.getHandler('test'));
});

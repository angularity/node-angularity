'use strict';

var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    browserSync = require('browser-sync');

var hr      = require('../lib/util/hr'),
    config  = require('../lib/config/config'),
    streams = require('../lib/config/streams');

var HTTP_PORT     = config.getServerHttpPort();
var CONSOLE_WIDTH = config.getConsoleWidth();

gulp.task('server', ['build'], function () {
  console.log(hr('-', CONSOLE_WIDTH, 'server'));
  gutil.log('serving on port:', HTTP_PORT);
  browserSync({
    server  : {
      baseDir: streams.HTML_BUILD,
      routes : streams.routes()
    },
    port    : HTTP_PORT,
    logLevel: 'silent',
    open    : false
  });
});

gulp.task('reload', function () {
  console.log(hr('-', CONSOLE_WIDTH, 'reload'));
  gutil.log('serving on port:', HTTP_PORT);
  browserSync.reload();
});
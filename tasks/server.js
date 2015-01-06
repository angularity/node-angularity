'use strict';

var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    browserSync = require('browser-sync');

var angularity = require('../index');

gulp.task('server', ['build'], function () {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'server'));
  gutil.log('serving on port:', angularity.HTTP_PORT);
  browserSync({
    server  : {
      baseDir: angularity.HTML_BUILD,
      routes : angularity.routes()
    },
    port    : angularity.HTTP_PORT,
    logLevel: 'silent',
    open    : false
  });
});

gulp.task('reload', function () {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'reload'));
  gutil.log('serving on port:', angularity.HTTP_PORT);
  browserSync.reload();
});
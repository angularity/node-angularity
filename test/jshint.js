#!/usr/bin/env node
'use strict';

var jshint  = require('gulp-jshint'),
    gulp    = require('gulp'),
    path    = require('path'),
    stylish = require('jshint-stylish');

gulp.task('lint', function() {
  var cwd    = path.resolve(__dirname, '..'),
      config = path.resolve(cwd, '.jshintrc'),
      glob   = ['lib/**/*.js', 'tasks/**/*.js', 'bin/**/*.js', 'test/specs/**/*.js'];
  return gulp.src(glob, {cwd: cwd})
    .pipe(jshint(config))
    .pipe(jshint.reporter(stylish));
});

gulp.start('lint');
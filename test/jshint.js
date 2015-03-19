'use strict';
var jshint = require('gulp-jshint');
var gulp   = require('gulp');
var path = require('path');
var cwd = path.resolve(process.cwd(), '..');
var config = path.resolve(cwd, '.jshintrc');
var stylish = require('jshint-stylish');

gulp.task('lint', function() {
  return gulp.src([
    'lib/**/*.js',
    'tasks/**/*.js',
    'bin/**/*.js',
    'test/specs/**/*.js'
  ], {cwd:cwd})
    .pipe(jshint(config))
    .pipe(jshint.reporter(stylish));
});
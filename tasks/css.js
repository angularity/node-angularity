'use strict';

var gulp        = require('gulp'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence'),
    path        = require('path'),
    bourbon     = require('node-bourbon');

var config   = require('../lib/config/config'),
    nodeSass = require('../lib/build/node-sass'),
    hr       = require('../lib/util/hr'),
    streams  = require('../lib/config/streams');

var CONSOLE_WIDTH = config.getConsoleWidth();

gulp.task('css', function (done) {
  console.log(hr('-', CONSOLE_WIDTH, 'css'));
  runSequence(
    'css:clean',
    'css:build',
    done
  );
});

// clean the css build directory
gulp.task('css:clean', function () {
  return gulp.src(streams.BUILD + '/**/*.css*', {read: false})
    .pipe(rimraf());
});

// compile sass with the previously discovered lib paths
gulp.task('css:build', function () {
  var sass = nodeSass(CONSOLE_WIDTH)
    .libraries(process.cwd(), streams.NODE, streams.BOWER, bourbon.includePaths);
  return streams.scssApp({read: false})
    .pipe(sass.compile())
    .pipe(gulp.dest(streams.BUILD));
});
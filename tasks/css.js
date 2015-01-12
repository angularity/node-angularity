'use strict';

var gulp        = require('gulp'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence'),
    bourbon     = require('node-bourbon');

var nodeSass = require('../lib/build/node-sass'),
    config   = require('../lib/config/config'),
    hr       = require('../lib/util/hr'),
    streams  = require('../lib/config/streams'),
    sass;

var CONSOLE_WIDTH = config.getConsoleWidth();

gulp.task('css', function (done) {
  console.log(hr('-', CONSOLE_WIDTH, 'css'));
  runSequence(
    ['css:clean', 'css:init'],
    'css:build',
    done
  );
});

// clean the css build directory
gulp.task('css:clean', function () {
  return gulp.src(streams.CSS_BUILD + '/**/*.css*', {read: false})
    .pipe(rimraf());
});

// discover css libs
gulp.task('css:init', function () {
  sass = nodeSass(CONSOLE_WIDTH);
  return streams.scssLibStream({read: false})
    .pipe(sass.libraries(bourbon.includePaths));
});

// compile sass with the previously discovered lib paths
gulp.task('css:build', function () {
  return streams.scssSrcStream({read: false})
    .pipe(sass.compile())
    .pipe(gulp.dest(streams.CSS_BUILD));
});
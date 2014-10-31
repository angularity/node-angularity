'use strict';

var gulp        = require('gulp'),
    rimraf      = require('gulp-rimraf'),
    runSequence = require('run-sequence'),
    bourbon     = require('node-bourbon');

var nodeSass   = require('../lib/build/node-sass'),
    angularity = require('../index'),
    sass;

// CSS ---------------------------------
gulp.task('css', function (done) {
  console.log(angularity.hr('-', angularity.CONSOLE_WIDTH, 'css'));
  runSequence(
    ['css:clean', 'css:init'],
    'css:build',
    done
  );
});

// clean the css build directory
gulp.task('css:clean', function () {
  return gulp.src(angularity.CSS_BUILD + '/**/*.css*', {read: false})
    .pipe(rimraf());
});

// discover css libs
gulp.task('css:init', function () {
  sass = nodeSass(angularity.CONSOLE_WIDTH);
  return angularity.scssLibStream({read: false})
    .pipe(sass.libraries(bourbon.includePaths));
});

// compile sass with the previously discovered lib paths
gulp.task('css:build', function () {
  return angularity.scssSrcStream({read: false})
    .pipe(sass.compile())
    .pipe(gulp.dest(angularity.CSS_BUILD));
});
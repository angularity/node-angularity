'use strict';

var path            = require('path'),
    fs              = require('fs');

var gulp            = require('gulp'),
    jshint          = require('gulp-jshint'),
    rimraf          = require('gulp-rimraf'),
    runSequence     = require('run-sequence'),
    combined        = require('combined-stream'),
    to5ify          = require('6to5ify'),
    stringify       = require('stringify'),
    wordwrap        = require('wordwrap'),
    ngAnnotate      = require('browserify-ngannotate');

var karma           = require('../lib/test/karma'),
    browserify      = require('../lib/build/browserify'),
    taskYargs       = require('../lib/util/task-yargs'),
    hr              = require('../lib/util/hr'),
    streams         = require('../lib/config/streams'),
    jshintReporter  = require('../lib/util/jshint-reporter');

var cliArgs;
var transforms;

taskYargs.register('javascript', {
  description: (wordwrap(2, 80)('The "javascript" task performs a one time build of the javascript composition root(s).')),
  prerequisiteTasks: [],
  options: [
    {
      key: 'help',
      value: {
        describe: 'This help message',
        alias: ['h', '?'],
        boolean: true
      }
    },
    {
      key: 'unminified',
      value: {
        describe: 'Inhibit minification of javascript',
        alias: ['u'],
        boolean: true,
        default: false
      }
    },
    jshintReporter.yargsOption
  ],
  checks: [
    jshintReporter.yargsCheck
  ]
});

taskYargs.register('test', {
  description: wordwrap(2, 80)('The "test" task performs a one time build and '+
    'karma test of all .spec.js files in the project.'),
  prerequisiteTasks: ['javascript'],
  options: [
    karma.yargsOption
  ],
  checks: [
    karma.yargsCheck
  ]
});

gulp.task('javascript', function (done) {
  console.log(hr('-', 80, 'javascript'));
  init();
  runSequence(
    ['javascript:cleanbuild', 'javascript:lint'],
    ['javascript:build'],
    done
  );
});

gulp.task('test', function (done) {
  console.log(hr('-', 80, 'test'));
  init();
  runSequence(
    ['javascript:cleanunit', 'javascript:lint'],
    'javascript:unit',
    done
  );
});

// clean javascript from the build directory
gulp.task('javascript:cleanbuild', function () {
  return gulp.src(streams.BUILD + '/**/*.js*', { read: false })
    .pipe(rimraf());
});

// clean javascript from the test directory
gulp.task('javascript:cleanunit', function () {
  return gulp.src(streams.TEST + '/**/*.js*', { read: false })
    .pipe(rimraf());
});

// run linter
gulp.task('javascript:lint', function () {
  return combined.create()
    .append(streams.jsApp())
    .append(streams.jsLib())
    .append(streams.jsSpec())
    .pipe(jshint())
    .pipe(jshintReporter.get(cliArgs[jshintReporter.yargsOption.key]));
});

// karma unit tests in local library only
gulp.task('javascript:unit', function () {
  var reporters = []
    .concat(cliArgs[karma.yargsOption.key])
    .filter(function isString(value) {
      return (typeof value === 'string');
    });
  return combined.create()
    .append(
      streams
        .testDependencies({
          dev: true,
          read: false
        })
    )
    .append(
      streams
        .jsSpec()
        .pipe(browserify
          .compile(80, transforms.concat(browserify.jasmineTransform('@')))
          .all('index.js'))
        .pipe(gulp.dest(streams.TEST))
    )
    .pipe(karma.createConfig(reporters))
    .pipe(gulp.dest(streams.TEST))
    .pipe(karma.run(reporters, 80));
});

// give a single optimised javascript file in the build directory with source map for each
gulp.task('javascript:build', function () {
  return streams.jsApp({read: false})
    .pipe(browserify
      .compile(80, transforms)
      .each(!cliArgs.unminified))
    .pipe(gulp.dest(streams.BUILD));
});

/**
 * Defer initialisation until after a task starts
 */
function init() {
  var yargsInstance = taskYargs.getCurrent();
  yargsInstance
    .strict()
    .wrap(80);
  cliArgs = yargsInstance.argv;
  transforms = [
    to5ify.configure({ ignoreRegex: /(?!)/ }),  // convert any es6 to es5 (ignoreRegex is degenerate)
    stringify({ minify: !cliArgs.unminified })  // allow import of html to a string
  ];
  if (!cliArgs.unminified) {
    transforms.push(ngAnnotate);                // @ngInject for angular injection points)
  }
}

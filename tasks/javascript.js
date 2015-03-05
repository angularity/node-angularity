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

var optionDefinitionJsHintReporter = {
  key: 'jshint-reporter',
  value: {
    describe: 'Specify a custom JsHint reporter to use. Either a locally npm installed module, or the absolute path ' +
      'to one.',
    alias: ['j'],
    default: jshintReporter.defaultReporterName,
    string: true
  }
};
function checkJsHintReporter(argv) {
  if (argv.help) {
    return true;
  }
  else {
    var value = argv[optionDefinitionJsHintReporter.key];
    if (typeof value === 'string' && value.length > 0) {
      try {
        jshintReporter.get(value);
      }
      catch (ex) {
        throw new Error('Illegal value for "'+optionDefinitionJsHintReporter.key+'"\n' + ex);
      }
      return true;
    }
    else {
      throw new Error('Required option "'+optionDefinitionJsHintReporter.key+'" in not specified');
    }
  }
}

taskYargs.register('javascript', {
  description: (wordwrap(2, 80)('The "javascript" task performs a one time build of the javascript composition root(s).')),
  prerequisiteTasks: ['help'],
  options: [
    {
      key: 'unminified',
      value: {
        describe: 'Inhibit minification of javascript',
        alias: ['u'],
        boolean: true,
        default: false
      }
    },
    optionDefinitionJsHintReporter
  ],
  checks: [
    checkJsHintReporter
  ]
});

var optionDefinitonKarmaReporter = {
  key: 'karma-reporter',
  value: {
    describe: 'Specify a custom Karma reporter to use. ' +
      'Either a locally npm installed module, or an absolute path to one.',
    alias: ['k'],
    default: karma.defaultReporterName,
    string:true,
  }
};

function checkKarmaReporter(argv) {
  if (argv.help) {
    return true;
  }
  else {
    var value = argv[optionDefinitonKarmaReporter.key];
    if (typeof value === 'string' && value.length > 0) {
      try {
        karma.getPluginPath(value);
      }
      catch (ex) {
        throw new Error('Illegal value for "' + optionDefinitonKarmaReporter.key + '"\n' + ex);
      }
      return true;
    }
    else {
      throw new Error('Required option "' + optionDefinitonKarmaReporter.key + '" in not specified');
    }
  }
}

taskYargs.register('test', {
  description: wordwrap(2, 80)('The "test" task performs a one time build and ' +
    'karma test of all .spec.js files in the project.'),
  prerequisiteTasks: ['javascript'],
  options: [optionDefinitonKarmaReporter],
  checks: [checkKarmaReporter]
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
    .pipe(jshintReporter.get(cliArgs[optionDefinitionJsHintReporter.key]));
});

// karma unit tests in local library only
gulp.task('javascript:unit', function () {
  var reporters = []
    .concat(cliArgs[optionDefinitonKarmaReporter.key])
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

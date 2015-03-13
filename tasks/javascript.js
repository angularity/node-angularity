'use strict';

function setUpTaskJavascript(tyRun) {
  var cliArgs;
  var transforms;

  ////
  // TASK javascript
  ////

var jshintReporter  = require('../lib/util/jshint-reporter');

var optionDefinitionJsHintReporter = {
  key: 'jshint-reporter',
  value: {
    describe: 'Specify a custom JsHint reporter to use. Either a locally npm installed module, or the absolute path ' +
      'to one.',
    alias: ['j'],
    //TODO @bguiz get this from config
    default: 'angularity-jshint-reporter',
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

  var taskDefinitionJavascript = {
    name: 'javascript',
    description: ('The "javascript" task performs a one time build of the javascript composition root(s).'),
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
    ],
    onInit: function onInitJavascriptTask(yargsInstance) {
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

gulp.task('javascript', function (done) {
  console.log(hr('-', 80, 'javascript'));
  init(yargsInstance);
  runSequence(
    ['javascript:cleanbuild', 'javascript:lint'],
    ['javascript:build'],
    done
  );
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

// clean javascript from the build directory
gulp.task('javascript:cleanbuild', function () {
  return gulp.src(streams.BUILD + '/**/*.js*', { read: false })
    .pipe(rimraf());
});

// give a single optimised javascript file in the build directory with source map for each
gulp.task('javascript:build', function () {
  return streams.jsApp({read: false})
    .pipe(browserify
      .compile(80, transforms)
      .each(!cliArgs.unminified))
    .pipe(gulp.dest(streams.BUILD));
});
    },
    onRun: function onRunJavascriptTask(yargsInstance) {
      console.log('onRunJavascriptTask');
      var runSequence = require('run-sequence');
      runSequence(taskDefinitionJavascript.name);
    }
  };
  tyRun.taskYargs.register(taskDefinitionJavascript);

  ////
  // TASK test
  ////

  var karma           = require('../lib/test/karma')

  var optionDefinitonKarmaReporter = {
    key: 'karma-reporter',
    value: {
      describe: 'Specify a custom Karma reporter to use. ' +
        'Either a locally npm installed module, or an absolute path to one.',
      alias: ['k'],
      //TODO @bguiz get this from config
      default: 'karma-angularity-reporter',
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

  var taskDefinitionTest = {
    name: 'test',
    description: 'The "test" task performs a one time build and ' +
      'karma test of all .spec.js files in the project.',
    prerequisiteTasks: ['javascript'],
    options: [optionDefinitonKarmaReporter],
    checks: [checkKarmaReporter],
    onInit: function onInitTestTask(yargsInstance) {
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

      gulp.task('test', function (done) {
        console.log(hr('-', 80, 'test'));
        init(yargsInstance);
        runSequence(
          ['javascript:cleanunit', 'javascript:lint'],
          'javascript:unit',
          done
        );
      });

      // clean javascript from the test directory
      gulp.task('javascript:cleanunit', function () {
        return gulp.src(streams.TEST + '/**/*.js*', { read: false })
          .pipe(rimraf());
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
    },
    onRun: function onRunTestTask(yargsInstance) {
      var runSequence = require('run-sequence');
      runSequence(taskDefinitionTest.name);
    }
  };
  tyRun.taskYargs.register(taskDefinitionTest);


  /**
   * Defer initialisation until after a task starts
   */
  function init(yargsInstance) {
    cliArgs = yargsInstance
        .strict()
        .wrap(80)
        .argv;
    var to5ify          = require('6to5ify'),
        stringify       = require('stringify'),
        ngAnnotate      = require('browserify-ngannotate');
    transforms = [
      to5ify.configure({ ignoreRegex: /(?!)/ }),  // convert any es6 to es5 (ignoreRegex is degenerate)
      stringify({ minify: !cliArgs.unminified })  // allow import of html to a string
    ];
    if (!cliArgs.unminified) {
      transforms.push(ngAnnotate);                // @ngInject for angular injection points)
    }
  }
}

module.exports = setUpTaskJavascript;

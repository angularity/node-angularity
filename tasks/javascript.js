'use strict';

function setUpTaskJavascript(options) {
  var jshintReporter  = require('../lib/util/jshint-reporter');
  var karma           = require('../lib/test/karma');

  var optionDefinitionJsHintReporter = {
    key: 'jshint-reporter',
    value: {
      describe: 'Specify a custom JsHint reporter to use. Either a locally npm installed module,' +
      ' or the absolute path to one.',
      alias: ['j'],
      //TODO @bguiz get this from config
      default: 'angularity-jshint-reporter',
      string: true
    }
  };

  var optionDefinitionKarmaReporter = {
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

  function checkKarmaReporter(argv) {
    if (argv.help) {
      return true;
    }
    else {
      var value = argv[optionDefinitionKarmaReporter.key];
      if (typeof value === 'string' && value.length > 0) {
        try {
          karma.getPluginPath(value);
        }
        catch (ex) {
          throw new Error('Illegal value for "' + optionDefinitionKarmaReporter.key + '"\n' + ex);
        }
        return true;
      }
      else {
        throw new Error('Required option "' + optionDefinitionKarmaReporter.key + '" in not specified');
      }
    }
  }

  var taskDefinition = {
    name: 'javascript',
    description: [
      'The "javascript" task performs a one time build of the javascript composition root(s)',
      'and also bundles all .spec.js files in the project.',
      '',
      'angularity javascript', 'Run this task',
      'angularity javascript -u', 'Run this task but do not minify javascript'
    ].join('/n'),
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
      optionDefinitionJsHintReporter,
      optionDefinitionKarmaReporter
    ],
    checks: [
      checkJsHintReporter,
      checkKarmaReporter
    ],
    onInit: function onInitJavascriptTask(yargsInstance) {
      var gulp            = options.gulp || require('gulp'),
          jshint          = require('gulp-jshint'),
          rimraf          = require('gulp-rimraf'),
          semiflat        = require('gulp-semiflat'),
          runSequence     = require('run-sequence'),
          combined        = require('combined-stream'),
          to5ify          = require('6to5ify'),
          stringify       = require('stringify'),
          ngAnnotate      = require('browserify-ngannotate');

      var karma           = require('../lib/test/karma'),
          browserify      = require('../lib/build/browserify'),
          hr              = require('../lib/util/hr'),
          streams         = require('../lib/config/streams'),
          jshintReporter  = require('../lib/util/jshint-reporter');

      var cliArgs;
      cliArgs = yargsInstance
        .strict()
        .wrap(80)
        .argv;

      gulp.task('javascript', function (done) {
        console.log(hr('-', 80, 'javascript'));
        //NOTE Unit tests are built but not run for the javascript task
        // This is done to allow external karma watchers (e.g. webstorm)
        runSequence(
          ['javascript:cleanbuild', 'javascript:cleanunit', 'javascript:lint'],
          ['javascript:build', 'javascript:unit'],
          done
        );
      });

      // clean javascript from the build directory
      gulp.task('javascript:cleanbuild', function () {
        return gulp.src(streams.BUILD + '/**/*.js*', {read: false})
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

      // give a single optimised javascript file in the build directory with source map for each
      gulp.task('javascript:build', function () {
        return streams.jsApp({read: false})
          .pipe(browserify
            .compile(80, getTransforms(!cliArgs.unminified))
            .each(!cliArgs.unminified))
          .pipe(gulp.dest(streams.BUILD));
      });

      // clean javascript from the test directory
      //  don't remove the karma conf or WebStorm ide will have problems
      gulp.task('javascript:cleanunit', function () {
        return gulp
          .src([streams.TEST + '/**/*.js*', '!**/karma.conf.js'], {read: false}) // keep configuration
          .pipe(rimraf());
      });

      // karma unit tests in local library only
      gulp.task('javascript:unit', function () {
        var reporters = []
          .concat(cliArgs[optionDefinitionKarmaReporter.key])
          .filter(Boolean);
        return combined.create()
          .append(
            streams
              .testDependencies({
                dev : true,
                read: false
              })
          )
          .append(
            streams
              .jsSpec()
              .pipe(browserify
                .compile(80, getTransforms().concat(browserify.jasmineTransform('@')))
                .all('index.js', false, '/base'))
              .pipe(gulp.dest(streams.TEST))
          )
          .pipe(semiflat(process.cwd()))
          .pipe(karma.createConfig(reporters))
          .pipe(gulp.dest(streams.TEST));
      });

      /**
       * Retrieve the transform list
       * @param {boolean} isMinify Indicates whether minification will be used
       */
      function getTransforms(isMinify) {
        return [
          to5ify.configure({ ignoreRegex: /(?!)/ }),   // convert any es6 to es5 (degenerate regex)
          stringify({ minify: false }),                // allow import of html to a string
          isMinify && ngAnnotate, { sourcemap: true }  // @ngInject for angular injection points
        ].filter(Boolean);
        // TODO @bholloway fix stringify({ minify: true }) throwing error on badly formed html so that we can minify
        // TODO @bholloway fix sourcemaps in ngAnnotate so that it may be included even when not minifying
      }

      // Augment exported function with utility functions because
      // dependant tasks would like to share this
      setUpTaskJavascript.getTransforms = getTransforms;
    },
    onRun: function onRunJavascriptTask() {
      var gulp        = options.gulp || require('gulp');
      gulp.run(taskDefinition.name);
    }
  };

  options.taskYargsRun.taskYargs.register(taskDefinition);
}

module.exports = setUpTaskJavascript;

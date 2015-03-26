'use strict';

var JSHINT_REPORTER_FLAG = 'jshint-reporter',
    KARMA_REPORTER_FLAG  = 'karma-reporter';

// TODO make some note about why a karma reporter is required
module.exports = function javascriptTask(context) {
  var jshintReporter = require('../lib/util/jshint-reporter'),
      karma          = require('../lib/test/karma');

// TODO transforms come from the context
context.browserifyTransforms = browserifyTransforms;

  // protect against api change
  ['gulp', 'runSequence', 'streams', 'browserifyTransforms'].forEach(assertField(context));

  // options definition
  var options = [
    {
      keys    : ['unminified', 'u'],
      describe: 'Inhibit minification of javascript',
      boolean : true,
      default : false
    }, {
      keys    : [JSHINT_REPORTER_FLAG, 'j'],
      describe: 'Specify a custom JsHint reporter to use. Either a locally npm installed module, or the absolute ' +
       'path to one.',
      default : 'angularity-jshint-reporter', //TODO @bguiz get this from config
      string  : true
    }, {
      keys    : [KARMA_REPORTER_FLAG, 'k'],
      describe: 'Specify a custom Karma reporter to use. Either a locally npm installed module, or an absolute path ' +
      'to one.',
      default : 'karma-angularity-reporter',  //TODO @bguiz get this from config
      string  : true
    }
  ];

  // task definition
  return {
    name          : 'javascript',
    inherit       : ['help'],
    description   : [
      'The "javascript" task performs a one time build of the javascript composition root(s) and also bundles all ' +
      '.spec.js files in the project.',
      '',
      'The composition(s) are minified by default but source maps are generate. These test specs are never ' +
      'minified, regardless of what options are in effect.',
      '',
      'This task generates a karma.conf.js so that you may use an external karma test runner. You therefore have the ' +
      'ability to specify a karma reporter, even though you are not running the tests.',
      '',
      'Examples:',
      '',
      'angularity javascript        Run this task',
      'angularity javascript -u     Run this task but do not minify javascript'
    ].join('\n'),
    options       : options,
    checks        : [
      getCheck(JSHINT_REPORTER_FLAG, jshintReporter),
      getCheck(KARMA_REPORTER_FLAG, karma)
    ],
    implementation: implementation
  };

  /**
   * TODO description
   */
  function implementation(cliArgs) {
    var gulp        = context.gulp,
        runSequence = context.runSequence,
        streams     = context.streams,
        transforms  = context.browserifyTransforms;

    var jshint   = require('gulp-jshint'),
        rimraf   = require('gulp-rimraf'),
        semiflat = require('gulp-semiflat'),
        combined = require('combined-stream');

    var browserify = require('../lib/build/browserify'),
        hr         = require('../lib/util/hr');

    gulp.task('javascript', function (done) {
      console.log(hr('-', 80, 'javascript'));
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
        .pipe(jshintReporter.get(cliArgs[JSHINT_REPORTER_FLAG]));
    });

    // give a single optimised javascript file in the build directory with source map for each
    gulp.task('javascript:build', function () {
      return streams.jsApp({read: false})
        .pipe(browserify(80, transforms(!cliArgs.unminified))
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
        .concat(cliArgs[KARMA_REPORTER_FLAG])
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
            .pipe(browserify(80, transforms(false))
              .all('index.js', false, '/base'))
            .pipe(gulp.dest(streams.TEST))
        )
        .pipe(semiflat(process.cwd()))
        .pipe(karma.createConfig(reporters))
        .pipe(gulp.dest(streams.TEST));
    });
  }

  /**
   * TODO description
   */
  function getCheck(field, collection) {
    return function checkReporter(argv) {
      if (argv.help) {
        return true;
      }
      else {
        var value = argv[field];
        if (typeof value === 'string' && value.length > 0) {
          try {
            collection.get(value);
          }
          catch (ex) {
            throw new Error('Illegal value for "' + field + '"\n' + ex);
          }
          return true;
        }
        else {
          throw new Error('Required option "' + field + '" in not specified');
        }
      }
    };
  }

};

// TODO transforms come from the context
/**
 * Retrieve the transform list
 * @param {boolean} isMinify Indicates whether minification will be used
 */
function browserifyTransforms(isMinify) {
  var to5ify     = require('6to5ify'),
      stringify  = require('stringify'),
      ngAnnotate = require('browserify-ngannotate');
  return [
    to5ify.configure({ignoreRegex: /(?!)/}),   // convert any es6 to es5 (degenerate regex)
    stringify({minify: false}),                // allow import of html to a string
    isMinify && ngAnnotate, {sourcemap: true}  // @ngInject for angular injection points
  ].filter(Boolean);
  // TODO @bholloway fix stringify({ minify: true }) throwing error on badly formed html so that we can minify
  // TODO @bholloway fix sourcemaps in ngAnnotate so that it may be included even when not minifying
}

/**
 * TODO move this to package angularity-util?
 */
function assertField(context) {
  return function assertForField(field) {
    if (!context[field]) {
      throw new Error('Plugin Incompatibility: Context must specify "' + field + '"');
    }
  };
}

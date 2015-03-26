'use strict';

module.exports = function serverTask(context) {
  var defaults = require('../lib/config/defaults');

  // protect against api change
  ['gulp', 'runSequence', 'streams'].forEach(assertField(context));

  // persistence of defaults
  var config = defaults.getInstance()
    .file('angularity.json')
    .defaults({
      port: 55555
    });

  // option definition
  var options = [
    {
      keys    : ['port', 'p'],
      describe: 'A port for the development web server',
      default : config.get('port')
    }
  ];

  // task definition
  return {
    name          : 'server',
    inherit       : ['help', 'build'],
    description   : [
      'The "server" task performs a one time build and then serves the application on localhost at the given port.',
      '',
      'This task generates a karma.conf.js so that you may use an external karma test runner. You therefore have the ' +
      'ability to specify a karma reporter, even though you are not running the tests.',
      '',
      'Examples:',
      '',
      'angularity server              Run this task',
      'angularity server -p 12345     Run this task and serve on port 12345'
    ].join('\n'),
    options       : options,
    checks        : [checkPort],
    implementation: implementation
  };

  /**
   * TODO description
   * @param argv
   * @returns {boolean}
   */
  function checkPort(argv) {
    var value = argv.port;
    if (argv.help) {
      return true;
    }
    else if ((typeof value !== 'number') || isNaN(parseInt(value)) || (Math.round(value) !== value)) {
      throw new Error('port must be an integer');
    }
    else {
      return true;
    }
  }

  /**
   * TODO description
   * @param cliArgs
   */
  function implementation(cliArgs) {
    var gulp    = context.gulp,
        streams = context.streams;

    var gutil       = require('gulp-util'),
        browserSync = require('browser-sync');

    var hr = require('../lib/util/hr');

    gulp.task('server', ['build'], function () {
      console.log(hr('-', 80, 'server'));

      // debug message
      gutil.log('serving on port:', cliArgs.port);

      // start serving with browser sync
      browserSync({
        server  : {
          baseDir: streams.BUILD,
          routes : streams.ROUTES
        },
        port    : cliArgs.port,
        logLevel: 'silent',
        open    : false
      });
    });

    gulp.task('reload', function () {
      console.log(hr('-', 80, 'reload'));
      gutil.log('serving on port:', cliArgs.port);
      browserSync.reload();
    });
  }

};

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
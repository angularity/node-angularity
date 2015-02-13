'use strict';

var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    wordwrap    = require('wordwrap'),
    browserSync = require('browser-sync');

var defaults         = require('../lib/config/defaults'),
    yargs            = require('../lib/util/yargs'),
    hr               = require('../lib/util/hr'),
    jshintReporter   = require('../lib/util/jshint-reporter'),
    karma            = require('../lib/test/karma'),
    streams          = require('../lib/config/streams');

var cliArgs;

var config = defaults.getInstance()
  .file('angularity.json')
  .defaults({
    port: 55555
  });

var check = yargs.createCheck()
  // don't check if we are just accessing help
  .withGate(function (argv) {
    return !argv.help;
  })
  .withTest({
    port: function (value) {
      if ((typeof value !== 'number') || isNaN(parseInt(value)) || (Math.round(value) !== value)) {
        return 'port must be an integer';
      }
    }
  })
  .commit();

yargs.getInstance('server')
  .usage(wordwrap(2, 80)('The "server" task performs a one time build and then serves the application on localhost ' +
    'at the given port.'))
  .example('angularity server', 'Run this task and serve on the default port')
  .example('angularity server -p 8080', 'Run this task and serve at http://localhost:8080')
  .example('angularity server -n', 'Run this task but do not minify built javascript')
  .options('help', {
    describe: 'This help message',
    alias   : [ 'h', '?' ],
    boolean : true
  })
  .options('unminified', {
    describe: 'Inhibit minification of javascript',
    alias   : 'u',
    boolean : true,
    default : false
  })
  .options('port', {
    describe: 'A port for the development web server',
    alias   : 'p',
    default : config.get('port')
  })
  .options(jshintReporter.yargsOption.key, jshintReporter.yargsOption.value)
  .options(karma.yargsOption.key, karma.yargsOption.value)
  .strict()
  .check(yargs.subCommandCheck)
  .check(check)
  .check(jshintReporter.yargsCheck)
  .check(karma.yargsCheck)
  .wrap(80);

gulp.task('server', ['build'], function () {
  console.log(hr('-', 80, 'server'));

  // find the yargs instance that is most appropriate for the given command line parameters
  cliArgs = yargs.resolveArgv();

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

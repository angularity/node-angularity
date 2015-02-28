'use strict';

var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    wordwrap    = require('wordwrap'),
    browserSync = require('browser-sync');

var defaults       = require('../lib/config/defaults'),
    taskYargs       = require('../lib/util/task-yargs'),
    hr             = require('../lib/util/hr'),
    jshintReporter = require('../lib/util/jshint-reporter'),
    streams        = require('../lib/config/streams');

var cliArgs;

var config = defaults.getInstance()
  .file('angularity.json')
  .defaults({
    port: 55555
  });

taskYargs.register('server', {
  description: (wordwrap(2, 80)('The "release" task performs a single build and exports the build files along with bower ' +
    'components to a release directory.')),
  prerequisiteTasks: ['build'],
  checks: [
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
  ],
  options: [
    {
      key: 'port',
      value: {
        describe: 'A port for the development web server',
        alias   : 'p',
        default : config.get('port')
      }
    }
  ]
});

gulp.task('server', ['build'], function () {
  console.log(hr('-', 80, 'server'));

  // find the yargs instance that is most appropriate for the given command line parameters
  var yargsInstance = taskYargs.getCurrent();
  yargsInstance
    .strict()
    .wrap(80);
  cliArgs = yargsInstance.argv;

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

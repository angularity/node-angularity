'use strict';

function setUpTaskServer(tyRun) {
  var defaults = require('../lib/config/defaults');
  var config = defaults.getInstance()
    .file('angularity.json')
    .defaults({
      port: 55555
    });

  var taskDefinition = {
    name: 'server',
    description: ('The "release" task performs a single build and exports the build files along with bower ' +
      'components to a release directory.'),
    prerequisiteTasks: ['help', 'build'],
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
    ],
    onInit: function onInitServerTask(yargsInstance) {
      console.log('onInitServerTask');

      var gulp        = require('gulp'),
          gutil       = require('gulp-util'),
          wordwrap    = require('wordwrap'),
          browserSync = require('browser-sync');

      var taskYargs       = require('../lib/util/task-yargs'),
          hr             = require('../lib/util/hr'),
          jshintReporter = require('../lib/util/jshint-reporter'),
          streams        = require('../lib/config/streams');

      var cliArgs;

      gulp.task('server', ['build'], function () {
        console.log(hr('-', 80, 'server'));

        cliArgs = yargsInstance
          .strict()
          .wrap(80)
          .argv;

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
    },
    onRun: function onRunServerTask(yargsInstance) {
      console.log('onRunServerTask');
      var runSequence = require('run-sequence');
      runSequence(taskDefinition.name);
    }
  };
  tyRun.taskYargs.register(taskDefinition);
}

module.exports = setUpTaskServer;

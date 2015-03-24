'use strict';

function setUpTaskServer(context) {
  if (!context.gulp) {
    throw new Error('Context must specify gulp instance');
  }

  var defaults = require('../lib/config/defaults');
  var config = defaults.getInstance()
    .file('angularity.json')
    .defaults({
      port: 55555
    });

  var taskDefinition = {
    name: 'server',
    description: [
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
      var gulp        = context.gulp,
          gutil       = require('gulp-util'),
          browserSync = require('browser-sync');

      var hr          = require('../lib/util/hr'),
          streams     = require('../lib/config/streams');

      var cliArgs;
      cliArgs = yargsInstance
        .strict()
        .wrap(80)
        .argv;

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
    },
    onRun: function onRunServerTask() {
      var gulp        = context.gulp;
      gulp.start(taskDefinition.name);
    }
  };

  return taskDefinition;
}

module.exports = setUpTaskServer;

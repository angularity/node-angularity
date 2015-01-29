'use strict';

var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    wordwrap    = require('wordwrap'),
    browserSync = require('browser-sync');

var config  = require('../lib/config/config'),
    yargs   = require('../lib/util/yargs'),
    hr      = require('../lib/util/hr'),
    streams = require('../lib/config/streams');

var cliArgs = yargs.resolveInstance;

yargs.getInstance('server')
  .usage(wordwrap(2, 80)('The "server" task performs a one time build and then serves the application on localhost ' +
    'at the given port.'))
  .example('$0 server', 'Run this task and serve on the default port')
  .example('$0 server -p 8080', 'Run this task and serve at http://localhost:8080')
  .example('$0 server -n', 'Run this task but do not minify built javascript')
  .describe('h', 'This help message').alias('h', '?').alias('h', 'help')
  .describe('u', 'Inhibit minification of javascript').alias('u', 'unminified').boolean('u').default('u', false)
  .describe('p', 'Define a port for the development web server').alias('p', 'port').default('p', 55555) // TODO default from config
  .strict()
  .check(yargs.subCommandCheck)
  .wrap(80);

gulp.task('server', ['build'], function () {
  console.log(hr('-', 80, 'server'));
  gutil.log('serving on port:', cliArgs().port);
  browserSync({
    server  : {
      baseDir: streams.BUILD,
      routes : streams.ROUTES
    },
    port    : cliArgs().port,
    logLevel: 'silent',
    open    : false
  });
});

gulp.task('reload', function () {
  console.log(hr('-', 80, 'reload'));
  gutil.log('serving on port:', cliArgs().port);
  browserSync.reload();
});

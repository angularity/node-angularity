'use strict';

var gulp          = require('gulp'),
    watch         = require('gulp-watch'),
    wordwrap      = require('wordwrap'),
    watchSequence = require('gulp-watch-sequence');

var defaults = require('../lib/config/defaults'),
    yargs    = require('../lib/util/yargs'),
    hr       = require('../lib/util/hr'),
    streams  = require('../lib/config/streams');

var config = defaults.getInstance()
  .file('angularity.json')
  .defaults({
    port: 55555
  });

yargs.getInstance('watch')
  .usage(wordwrap(2, 80)('The "watch" task performs an initial build and then serves the application on localhost at ' +
    'the given port. It then watches the project and performs rebuild of Javascript and/or SASS compositions upon ' +
    'change. This is followed by HTML injection and browser reload.'))
  .example('$0 watch', 'Run this task')
  .example('$0 watch -p 8080', 'Run this task and serve at http://localhost:8080')
  .example('$0 watch -n', 'Run this task but do not minify javascript')
  .describe('h', 'This help message').alias('h', '?').alias('h', 'help').boolean('h')
  .describe('u', 'Inhibit minification of javascript').alias('u', 'unminified').boolean('u').default('u', false)
  .describe('p', 'Define a port for the development web server').alias('p', 'port').default('p', config.get('port'))
  .strict()
  .check(yargs.subCommandCheck)
  .check(yargs.getCheckFor({
    port: function (value) {
      if ((typeof value !== 'number') || isNaN(parseInt(value))) {
        return 'port must be an integer';
      }
    }
  }))
  .wrap(80);

gulp.task('watch', ['server'], function () {

  // enqueue actions to avoid multiple trigger
  var queue = watchSequence(500, function () {
    console.log(hr('\u2591', 80));
  });

  // watch statements
  watch(streams.getGlob(['**/*.js', '**/*.html', '!*.*', '!**/*.spec.*'], [streams.APP, streams.NODE, streams.BOWER]), {
    name      : 'JS|HTML',
    emitOnGlob: false
  }, queue.getHandler('js', 'html', 'reload')); // app html will be needed in case previous injection failed

  watch(streams.getGlob(['**/*.scss', '!*.scss'], [streams.APP, streams.NODE, streams.BOWER]), {
    name      : 'CSS',
    emitOnGlob: false
  }, queue.getHandler('css', 'html', 'reload')); // html will be needed in case previous injection failed

  watch([streams.BOWER + '/**/*', '!**/*.js', '!**/*.scss'], {  // don't conflict with JS or CSS
    name      : 'BOWER',
    emitOnGlob: false
  }, queue.getHandler('html', 'reload'));

  watch(streams.getGlob(['**/*.spec.js', '!*.spec.js']), {
    name      : 'TEST',
    emitOnGlob: false
  }, queue.getHandler('test'));
});

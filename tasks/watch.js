'use strict';

function setUpTaskWatch(tyRun) {
  var defaults = require('../lib/config/defaults');

  var config = defaults.getInstance()
    .file('angularity.json')
    .defaults({
      port: 55555
    });

  var taskDefinition = {
    name: 'watch',
    description: ('The "watch" task performs an initial build and then serves the application on localhost at ' +
      'the given port. It then watches the project and performs rebuild of Javascript and/or SASS compositions upon ' +
      'change. This is followed by HTML injection and browser reload.'),
    prerequisiteTasks: ['help', 'server'],
    checks: [],
    options: [],
    onInit: function onInitWatchTask(yargsInstance) {
      var gulp          = require('gulp'),
          watch         = require('gulp-watch'),
          wordwrap      = require('wordwrap'),
          watchSequence = require('gulp-watch-sequence');

      var defaults         = require('../lib/config/defaults'),
          hr               = require('../lib/util/hr'),
          karma            = require('../lib/test/karma'),
          jshintReporter   = require('../lib/util/jshint-reporter'),
          streams          = require('../lib/config/streams');

      gulp.task('watch', ['server'], function () {
        // enqueue actions to avoid multiple trigger
        var queue = watchSequence(500, function () {
          console.log(hr('\u2591', 80));
        });

        // watch statements
        watch(streams.getGlob(['**/*.js', '**/*.html', '!*.*', '!**/*.spec.*'], [streams.APP, streams.NODE, streams.BOWER]), {
          name      : 'JS|HTML',
          emitOnGlob: false
        }, queue.getHandler('javascript', 'html', 'reload')); // app html will be needed in case previous injection failed

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
    },
    onRun: function onRunWatchTask(yargsInstance) {
      var runSequence = require('run-sequence');
      runSequence(taskDefinition.name);
    }
  };

  tyRun.taskYargs.register(taskDefinition);
};

module.exports = setUpTaskWatch;

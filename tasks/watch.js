'use strict';

function setUpTaskWatch(options) {
  var taskDefinition = {
    name: 'watch',
    description: ('The "watch" task performs an initial build and then serves the application on localhost at ' +
      'the given port. It then watches the project and performs rebuild of Javascript and/or SASS compositions upon ' +
      'change. This is followed by HTML injection and browser reload.'),
    prerequisiteTasks: ['help', 'server'],
    checks: [],
    options: [],
    onInit: function onInitWatchTask() {
      var gulp          = options.gulp || require('gulp'),
          watch         = require('gulp-watch'),
          watchSequence = require('gulp-watch-sequence');

      var hr               = require('../lib/util/hr'),
          streams          = require('../lib/config/streams');

      gulp.task('watch', ['server'], function () {
        console.log(hr('-', 80, 'watch'));
        var getGlobApp = streams.getLocalLibGlob(streams.APP);

        // enqueue actions to avoid multiple trigger
        var queue = watchSequence(500, function () {
          console.log(hr('\u2591', 80));
        });

        // watch statements
        watch(getGlobApp('**/*.js', '**/*.html', '!' + streams.APP + '/**/*.html', '!*.*'), {
          name      : 'JS|HTML',
          emitOnGlob: false
        }, queue.getHandler('javascript', 'html', 'reload')); // html will be needed in case previous injection failed

        watch(getGlobApp(['**/*.scss', '!*.scss']), {
          name      : 'CSS',
          emitOnGlob: false
        }, queue.getHandler('css', 'html', 'reload')); // html will be needed in case previous injection failed

        // don't conflict JS or CSS
        watch([streams.APP + '/**/*.html', streams.BOWER + '/**/*', '!**/*.js', '!**/*.scss'], {
          name      : 'INJECT',
          emitOnGlob: false
        }, queue.getHandler('html', 'reload'));
      });
    },
    onRun: function onRunWatchTask() {
      var gulp        = options.gulp || require('gulp');
      gulp.start.apply(gulp, [taskDefinition.name]);
    }
  };

  options.taskYargsRun.taskYargs.register(taskDefinition);
}

module.exports = setUpTaskWatch;

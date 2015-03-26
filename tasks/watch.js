'use strict';

module.exports = function watchTask(context) {

  // protect against api change
  ['gulp', 'streams'].forEach(assertField(context));

  // task definition
  return {
    name          : 'watch',
    inherit       : ['help', 'server'],
    description   : [
      'The "watch" task performs an initial build and then serves the application on localhost at the given port.',
      '',
      'It then watches the project and performs rebuild of Javascript and/or SASS compositions and/or all .spec.js ' +
      'files upon change. This is followed by HTML injection and browser reload.',
      '',
      'This task generates a karma.conf.js so that you may use an external karma test runner. You therefore have the ' +
      'ability to specify a karma reporter, even though you are not running the tests.',
      '',
      'Examples:',
      '',
      'angularity watch              Run this task',
      'angularity watch -u           Run this task but do not minify javascript',
      'angularity watch -p 12345     Run this task and serve on port 12345'
    ].join('\n'),
    options       : [],
    checks        : [],
    implementation: implementation
  };

  function implementation() {
    var gulp    = context.gulp,
        streams = context.streams;

    var watch         = require('gulp-watch'),
        watchSequence = require('gulp-watch-sequence');

    var hr = require('../lib/util/hr');

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
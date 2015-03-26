'use strict';

module.exports = function buildTask(context) {

  // protect against api change
  ['gulp', 'runSequence'].forEach(assertField(context));

  // task definition
  return {
    name          : 'build',
    inherit       : ['help', 'javascript', 'css', 'html'],
    description   : [
      'The "build" task performs a single build of the javascript and SASS composition root(s) and also bundles all ' +
      '.spec.js files in the project.',
      '',
      'This task generates a karma.conf.js so that you may use an external karma test runner. You therefore have the ' +
      'ability to specify a karma reporter, even though you are not running the tests.',
      '',
      'Examples:',
      '',
      'angularity build        Run this task',
      'angularity build -u     Run this task but do not minify javascript'
    ].join('\n'),
    options       : [],
    checks        : [],
    implementation: implementation
  };

  /**
   * TODO description
   */
  function implementation() {
    var gulp        = context.gulp,
        runSequence = context.runSequence;

    var hr = require('../lib/util/hr');

    gulp.task('build', function (done) {
      console.log(hr('-', 80, 'build'));
      runSequence('javascript', 'css', 'html', done);
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

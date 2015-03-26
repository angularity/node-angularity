'use strict';

module.exports = function testTask(context) {

  // protect against api change
  ['gulp', 'streams'].forEach(assertField(context));

  return {
    name          : 'test',
    inherit       : ['javascript'],
    description   : [
      'The "test" task performs a one time build and karma test of all .spec.js files in the project.',
      '',
      'Examples:',
      '',
      'angularity test    Run this task'
    ].join('\n'),
    options       : [],
    checks        : [],
    implementation: implementation
  };

  function implementation() {
    var gulp    = context.gulp,
        streams = context.streams;

    var karma = require('../lib/test/karma'),
        hr    = require('../lib/util/hr');

    gulp.task('test', ['javascript'], function () {
      console.log(hr('-', 80, 'test'));
      gulp.src(streams.TEST + '/karma.conf.js')
        .pipe(karma.run());
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
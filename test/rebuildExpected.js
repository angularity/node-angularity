/**
 * Shortcut utiltiy to build the expected project files for the integration tests.
 * @type {exports}
 */

var helper = require('./helpers/helper');
var minimalEs5 = helper.expectedFolder('minimal-es5');
rebuildExpectedProject(minimalEs5);

function rebuildExpectedProject(location) {
  'use strict';
  process.chdir(location);

  helper.runAngularityAlias(['build', 'test', 'release'])
    .then(function(){
      console.log('expected project in ' + location + ' is rebuilt.');
    });
}
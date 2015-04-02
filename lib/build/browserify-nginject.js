'use strict';

var transformTools = require('browserify-transform-tools');

/**
 * A transform that supports explicit <code>@ngInject</code> annotations
 */
function ngInjectTransform() {
  return transformTools.makeFalafelTransform('ngInjectTransform', null, function transform(node, opts, done) {
    if (testAnnotated(node)) {
      var source = node.source();

      // get an array of quoted parameter names
      var parameterNames = node.params
        .map(function(param) {
          return '"' + param.name + '"';
        });

      // named function implies name.$inject = [];
      var amended;
      if (node.id) {
        amended = [
          source,
          node.id.name + '.$inject = [' + parameterNames.join(',') + '];'
        ].join('\n');
      }
      // anonymous function implies [..., function() {} ]
      else {
        amended = '[' + parameterNames.concat(source).join(',') + ']';
      }

      // rewrite the node with the amended source code
      node.update(amended);
    }
    done();
  });
}

/**
 * Test whether the given node is annotated with <code>@ngInject</code>.
 * @param {object} node The
 * @returns {boolean}
 */
function testAnnotated(node) {
  var isFunction = /^Function(Declaration|Expression)$/.test(node.type); // only functions should be annotated
  if (isFunction && node.parent) {
    var split       = node.parent.source().split(node.source());
    var isAnnotated = (split.length > 1) && /@ngInject/.test(split[0]);
    return isAnnotated;
  } else {
    return false;
  }
}

module.exports = ngInjectTransform;
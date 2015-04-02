'use strict';

var transformTools = require('browserify-transform-tools');

/**
 * A transform that supports explicit <code>@ngInject</code> annotations
 */
function ngInjectTransform() {
  return transformTools.makeFalafelTransform('ngInjectTransform', null, function transform(node, opts, done) {
    if (testAnnotated(node)) {
      var updater = falafelUpdater(node);

      // get an array of quoted parameter names
      var parameters = node.params
        .map(function(param) {
          return '"' + param.name + '"';
        });

      // named function implies explicit $inject
      //  function baz(foo, bar){}; baz.$inject = [ "foo", "bar" ];
      if (node.id) {
        updater
          .append([
            ';',  // defensively insert semicolon as there is often problems otherwise
            node.id.name + '.$inject = [' + parameters.join(',') + '];'
          ].join('\n'));
      }
      // anonymous function implies array
      //  [ "foo", "bar", function(foo, bar) {} ]
      else {
        updater
          .prepend('[' + parameters.concat('').join(','))  // note trailing comma
          .append(']');
      }
    }
    done();
  });
}

function falafelUpdater(node) {
  var self = {
    prepend: prepend,
    append : append
  };
  return self;

  function prepend(value) {

    // temporarily rewrite the range to be only the first character
    var rangeHigh = node.range[1];
    node.range[1] = node.range[0] + 1;
    var firstChar = node.source();

    // make all our changes within the source range of the first character
    node.update(value + firstChar);

    // reinstate the range of the node
    node.range[1] = rangeHigh;

    // chainable
    return self;
  }

  function append(value) {

    // temporarily rewrite the range to be only the last character
    var rangeLow = node.range[0];
    node.range[0] = node.range[1] - 1;
    var lastChar = node.source();

    // make all our changes within the source range of the last character
    node.update(lastChar + value);

    // reinstate the range of the node
    node.range[0] = rangeLow;

    // chainable
    return self;
  }
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
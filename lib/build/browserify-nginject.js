'use strict';

var merge = require('lodash.merge');

var esprimaTransform = require('./browserify-esprima-transform');

/**
 * Esprima based explicity @ngInject annotation with sourcemaps.
 * @param {object} opt An options hash
 */
function browserifyNginject(opt) {
  return esprimaTransform(updater, opt);
}

/**
 * The updater function for the esprima transform
 * @param {string} file The filename for the Browserify transform
 * @param {object} ast The esprima syntax tree
 * @returns {object} The transformed esprima syntax tree
 */
function updater(file, ast) {
  (ast.comments || [])
    .filter(function getEndLoc(comment) {
      return /@ngInject/i.test(comment.value);
    })
    .map(getLocation('end', file))
    .map(findClosestNode(ast))
    .forEach(processNode(file));
  return ast;
}

/**
 * Get a hash of the location source merged with the parameters of 'start' or 'end'.
 * @param {string} field Either 'start' or 'end'
 * @param {string} [source] An optional explicit source
 * @return {function} A method that retrieves the hash for a given node
 */
function getLocation(field, source) {
  return function getLocationForNode(node) {
    return node && node.loc && merge({source: source || node.loc.source}, node.loc[field]);
  };
}

/**
 * Find the AST node immediately following the given location.
 * @param {object} ast The esprima syntax tree
 * @returns {function} Method that finds the closes AST node for a given location
 */
function findClosestNode(ast) {
  /**
   * @param {{line:number, column:number, source:string}} location A location to find relative to
   */
  return function forLocation(location) {
    var WHITE_LIST = /^(?!id|loc|comments).*$/;

    // use a queue to avoid recursion stack for large trees
    var queue = [ast];

    // first find the node that immediately follows the location
    var result  = null;
    var closest = {
      line  : Number.MAX_VALUE,
      column: Number.MAX_VALUE
    };

    // visit all nodes and find those closest following each comment
    //  do not assume any node structure except that it has a 'loc' property
    while (queue.length) {
      var node = queue.shift();
      for (var key in node) {
        var candidate = node[key];
        if (candidate && (typeof candidate === 'object') && WHITE_LIST.test(key)) {

          // find the closest
          var start    = getLocation('start')(candidate);
          var isCloser = isOrdered(location, start, closest);
          if (isCloser) {
            closest = start;
            result  = candidate;
          }

          // enqueue all objects
          queue.push(candidate);
        }
      }
    }

    // error or complete
    if (result) {
      return result;
    } else {
      throw new Error('Cannot resolve annotation at line:' + location.line + ',col:' + location.column);
    }
  };

  /**
   * Test whether the given locations are ordered
   * @param {...{line:number, column:number, source:string}} Any number of locations
   * @returns True for all items being in order, else False
   */
  function isOrdered() {
    return Array.prototype.slice.call(arguments)
      .every(function checkItemOrder(current, i, array) {
        var previous = array[i - 1] || {
            line  : 0,
            column: 0
          };
        return current && previous && (!current.source || !previous.source || (current.source === previous.source)) &&
          ((previous.line <= current.line) ||
          ((previous.line === current.line) && (previous.column <= current.column)));
      });
  }
}

/**
 * Add explicit dependency statements to the node.
 * @param {object} node The array in which the first item is the node to process
 * @param {object} [parent] An optional parent for the node
 */
function processNode(file) {
  return function processNode(node, parent) {
    var values;
    switch(node.type) {
      case 'ExpressionStatement':
        values = [].concat(node.expression);
        break;
      case 'ReturnStatement':
        values = [].concat(node.argument);
        break;
      //case 'VariableDeclaration':
      //  values = node.declarations;
      //  break;
      default:
        console.log(node.type);
    }
  };
}

//  transformTools.makeFalafelTransform('ngInjectTransform', null, function transform(node, opts, done) {
//    if (testAnnotated(node)) {
//      var updater = falafelUpdater(node);
//
//      // get an array of quoted parameter names
//      var parameters = node.params
//        .map(function(param) {
//          return '"' + param.name + '"';
//        });
//
//      // named function implies explicit $inject
//      //  function baz(foo, bar){}; baz.$inject = [ "foo", "bar" ];
//      if (node.id) {
//        updater
//          .append([
//            ';',  // defensively insert semicolon as there is often problems otherwise
//            node.id.name + '.$inject = [' + parameters.join(',') + '];'
//          ].join('\n'));
//      }
//      // anonymous function implies array
//      //  [ "foo", "bar", function(foo, bar) {} ]
//      else {
//        updater
//          .prepend('[' + parameters.concat('').join(','))  // note trailing comma
//          .append(']');
//      }
//    }
//    done();
//  });
//
//function falafelUpdater(node) {
//  var self = {
//    prepend: prepend,
//    append : append
//  };
//  return self;
//
//  function prepend(value) {
//
//    // temporarily rewrite the range to be only the first character
//    var rangeHigh = node.range[1];
//    node.range[1] = node.range[0] + 1;
//    var firstChar = node.source();
//
//    // make all our changes within the source range of the first character
//    node.update(value + firstChar);
//
//    // reinstate the range of the node
//    node.range[1] = rangeHigh;
//
//    // chainable
//    return self;
//  }
//
//  function append(value) {
//
//    // temporarily rewrite the range to be only the last character
//    var rangeLow = node.range[0];
//    node.range[0] = node.range[1] - 1;
//    var lastChar = node.source();
//
//    // make all our changes within the source range of the last character
//    node.update(lastChar + value);
//
//    // reinstate the range of the node
//    node.range[0] = rangeLow;
//
//    // chainable
//    return self;
//  }
//}
//
///**
// * Test whether the given node is annotated with <code>@ngInject</code>.
// * @param {object} node The node to test
// * @returns {boolean} True where annotated for ngInject else false
// */
//function testAnnotated(node) {
//  var isFunction = /^Function(Declaration|Expression)$/.test(node.type); // only functions should be annotated
//  if (isFunction && node.parent) {
//// TODO @bholloway check up the parent chain while still the first body element and not a function
//    var split       = node.parent.source().split(node.source());
//    var isAnnotated = (split.length > 1) && /@ngInject/.test(split[0]);
//    return isAnnotated;
//  } else {
//    return false;
//  }
//}

module.exports = browserifyNginject;
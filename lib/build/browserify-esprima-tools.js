'use strict';

var codegen        = require('escodegen'),
    esprima        = require('esprima'),
    through        = require('through2'),
    convert        = require('convert-source-map'),
    sourcemapToAst = require('sourcemap-to-ast');

var WHITE_LIST = /^(?!id|loc|comments|parent).*$/;

/**
 * Create a Browserify transform that works on an esprima syntax tree
 * @param {function} updater A function that works on the esprima AST
 * @param {object} [format] An optional format for escodegen
 * @returns {function} A browserify transform
 */
function createTransform(updater, format) {

  // transform
  return function browserifyTransform(file) {
    var chunks = [];
    return through(transform, flush);

    function transform(chunk, encoding, done) {
      /* jshint validthis:true */
      chunks.push(chunk);
      done();
    }

    function flush(done) {
      /* jshint validthis:true */
      var content = chunks.join('');

      // parse code to AST using esprima
      var ast;
      try {
        ast = esprima.parse(content, {
          loc    : true,
          comment: true,
          source : file
        });
      } catch(exception) {
        return done(exception);
      }

      // associate comments with nodes they annotate
      associateComments(ast);

      // make sure the AST has the data from the original source map
      var converter     = convert.fromSource(content);
      var originalMap   = converter && converter.toObject();
      var sourceContent = content;
      if (originalMap) {
        sourcemapToAst(ast, originalMap);
        sourceContent = originalMap.sourcesContent[0];
      }

      // update the AST
      var updated;
      try {
        updated = ((typeof updater === 'function') && updater(file, ast)) || ast;
      } catch(exception) {
        return done(exception);
      }

      // generate compressed code from the AST
      var pair = codegen.generate(updated, {
        sourceMap        : true,
        sourceMapWithCode: true,
        format           : format || {}
      });

      // ensure that the source map has sourcesContent or browserify will not work
      pair.map.setSourceContent(file, sourceContent);
      var mapComment = convert.fromJSON(pair.map.toString()).toComment();

      // push to the output
      this.push(new Buffer(pair.code + mapComment));
      done();
    }
  };
}

/**
 * Sort nodes by location, include comments, create parent reference
 * @param {object} ast The esprima syntax tree
 */
function orderNodes(ast) {
  return (Array.isArray(ast.comments) ? ast.comments.slice() : [])
    .concat(findNodes(ast, ast.parent))
    .sort(compareLocation);
}

/**
 * Create a setter that will replace the given node.
 * @param {object} candidate An esprima AST node to match
 * @param {number} [offset] 0 to replace, -1 to prepend, +1 to append
 * @returns {function|null} A setter that will replace the given node or Null on bad node
 */
function nodeSplicer(candidate, offset) {
  var found = findReferrer(candidate);
  if (found) {
    var key   = found.key;
    var obj   = found.object;
    var array = Array.isArray(obj) && obj;
    if (offset && !array) {
      throw new Error('Cannot splice with offset since the container is not an array');
    }
    else if (!array) {
      return function setter(value) {
        obj[key] = value;
      };
    }
    else if (offset < 0) {
      return function setter(value) {
        array.splice(key, 0, value);
      };
    }
    else if (offset > 0) {
      return function setter(value) {
        array.splice(key + 1, 0, value);
      };
    }
    else {
      return function setter(value) {
        array.splice(key, 1, value);
      };
    }
  }
}

module.exports = {
  createTransform: createTransform,
  orderNodes     : orderNodes,
  nodeSplicer    : nodeSplicer
};

/**
 * Associate comments with the node that follows them per an <code>annotates</code> property.
 * @param {object} ast An esprima AST with comments array
 */
function associateComments(ast) {
  var sorted = orderNodes(ast);
  ast.comments
    .forEach(function eachComment(comment) {

      // decorate the comment with the node that follows it in the sorted node list
      var index     = sorted.indexOf(comment);
      var annotates = sorted[index + 1];
      if (annotates) {
        comment.annotates = annotates;
      }

      // comments generally can't be converted by source-map and won't be considered by sourcemap-to-ast
      delete comment.loc;
    });
}

/**
 * Recursively find all nodes specified within the given node.
 * @param {object} node An esprima node
 * @param {object|undefined} [parent] The parent of the given node, where known
 * @returns {Array} A list of nodes
 */
function findNodes(node, parent) {
  var results = [];

  // valid node so push it to the list and set new parent
  if ('type' in node) {
    node.parent = parent;
    parent      = node;
    results.push(node);
  }

  // recurse object members using the queue
  for (var key in node) {
    if (WHITE_LIST.test(key)) {
      var value = node[key];
      if (value && (typeof value === 'object')) {
        results.push.apply(results, findNodes(value, parent));
      }
    }
  }

  // complete
  return results;
}

/**
 * Compare function for nodes with location.
 * @param {object} nodeA First node
 * @param {object} nodeB Second node
 * @returns {number} -1 where a follows b, +1 where b follows a, 0 otherwise
 */
function compareLocation(nodeA, nodeB) {
  var locA = nodeA && nodeA.loc;
  var locB = nodeB && nodeB.loc;
  if (!locA && !locB) {
    return 0;
  }
  else if (Boolean(locA) !== Boolean(locB)) {
    return locB ? +1 : locA ? -1 : 0;
  }
  else {
    var result =
      isOrdered(locB.end,   locA.start) ? +1 : isOrdered(locA.end,   locB.start) ? -1 : // non-overlapping
      isOrdered(locB.start, locA.start) ? +1 : isOrdered(locA.start, locB.start) ? -1 : // overlapping
      isOrdered(locA.end,   locB.end  ) ? +1 : isOrdered(locB.end,   locA.end  ) ? -1 : // enclosed
      0;
    return result;
  }
}

/**
 * Check the order of the given location tuples.
 * @param {{line:number, column:number}} tupleA The first tuple
 * @param {{line:number, column:number}} tupleB The second tuple
 * @returns {boolean} True where tupleA precedes tupleB
 */
function isOrdered(tupleA, tupleB) {
  return (tupleA.line < tupleB.line) || ((tupleA.line === tupleB.line) && (tupleA.column < tupleB.column));
}

/**
 * Find the object and field that refers to the given node.
 * @param {object} candidate An esprima AST node to match
 * @param {object} [container] Optional container to search within or the candidate parent where omitted
 * @returns {{object:object, key:*}} The object and its key where the candidate node is a value
 */
function findReferrer(candidate, container) {
  var result;
  if (candidate) {

    // initially for the parent of the candidate node
    container = container || candidate.parent;

    // consider keys in the node until we have a result
    var keys = getKeys(container);
    for (var i = 0; !result && (i < keys.length); i++) {
      var key = keys[i];
      if (WHITE_LIST.test(key)) {
        var value = container[key];

        // found
        if (value === candidate) {
          result = {
            object: container,
            key   : key
          };
        }
        // recurse
        else if (value && (typeof value === 'object')) {
          result = findReferrer(candidate, value);
        }
      }
    }
  }

  // complete
  return result;
}

/**
 * Get the keys of an object as strings or those of an array as integers.
 * @param {object|Array} container A hash or array
 * @returns {Array.<string|number>} The keys of the container
 */
function getKeys(container) {
  function arrayIndex(value, i) {
    return i;
  }
  if (typeof container === 'object') {
    return Array.isArray(container) ? container.map(arrayIndex) : Object.keys(container);
  } else {
    return [];
  }
}
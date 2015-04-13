'use strict';

var codegen   = require('escodegen'),
    esprima   = require('esprima'),
    through   = require('through2'),
    convert   = require('convert-source-map'),
    sourceMap = require('source-map');


/**
 * Create a Browserify transform that works on an esprima syntax tree
 * @param {function} updater A function that works on the esprima AST
 * @param {object} [format] An optional format for escodegen
 * @returns {function} A browserify transform
 */
function browserifyEsprimaTransform(updater, format) {

  // transform
  return function browserifyTransform(file) {
    var chunks = [];
    return through(transfrom, flush);

    function transfrom(chunk, encoding, done) {
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

      // make sure the AST has the data from the original source map
      var converter     = convert.fromSource(content);
      var originalMap   = converter && converter.toObject();
      var sourceContent = content;
      if (originalMap) {
        sourceMapToAst(ast, originalMap);
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

module.exports = browserifyEsprimaTransform;

/**
 * Reinstate original source map locations on the AST
 * @param {object} ast The esprima syntax tree
 * @param {object} map The source map
 */
function sourceMapToAst(ast, map) {

  // we will need a source-map consumer
  var consumer = new sourceMap.SourceMapConsumer(map);

  // create a list of nodes that have 'loc' properties
  var nodes = ast.comments.concat();

  // use a queue to avoid recursion stack for large trees
  var queue = [ast];
  while (queue.length) {
    var node = queue.shift();
    for (var key in node) {

      // consider only object members
      var candidate = node[key];
      if (candidate && (typeof candidate === 'object')) {
        if (key === 'loc') {
          nodes.push(node);
        } else {
          queue.push(candidate);
        }
      }
    }
  }

  // comments
  ast.comments
    .forEach(function eachComment(comment) {
      nodes.push(comment);
    });

  // sort nodes by current position
  nodes.sort(compareLocation);

  // calculate the original locations before applying them
  var calculated = nodes.map(calculateLocation);
  nodes.forEach(applyLocToNode(calculated));

  // complete
  return ast;

  /**
   * Map the location back to its original location, using adjacent values where necessary.
   * @param {object} node The node to consider
   * @param {number} i Index of this node object
   * @param {Array} nodes The nodes array
   * @returns {object} Amended location object
   */
  function calculateLocation(node, i, nodes) {
    var j, n, loc;

    // find the start location at the value or to its left
    var listStart = nodes.slice(0, i).concat(node);
    var origStart;
    for (n = 0, j = listStart.length - 1; !origStart && (j >= 0); j--, n++) {
      loc       = (n === 0) ? listStart[j].loc.start : listStart[j].loc.end;
      origStart = consumer.originalPositionFor(loc);
    }
    origStart = origStart || {
      line  : 0,
      column: 0
    };

    // find the end location at the value or to its right
    var listEnd = [node].concat(nodes.slice(i));
    var origEnd;
    for (n = 0, j = 0; !origEnd && (i < listEnd.length); i++, n++) {
      loc     = (n === 0) ? listEnd[j].loc.end : listEnd[j].loc.start;
      origEnd = consumer.originalPositionFor(loc);
    }
    origEnd = origEnd || {
      line  : Number.MAX_VALUE,
      column: Number.MAX_VALUE
    };

    // where both start and end locations are present
    if (origStart && origEnd) {
      return {
        start : {
          line  : origStart.line,
          column: origStart.column
        },
        end   : {
          line  : origEnd.line,
          column: origEnd.column
        },
        source: origStart.source,
        name  : origStart.name
      };
    } else {
      return null;
    }
  }
}

/**
 * Compare function for nodes with location.
 * @param {object} nodeA First node
 * @param {object} nodeB Second node
 * @returns {number} -1 where a follows b, +1 where b follows a, 0 otherwise
 */
function compareLocation(nodeA, nodeB) {
  var hasA = nodeA && nodeA.loc;
  var hasB = nodeB && nodeB.loc;
  if (!hasA && !hasB) {
    return 0;
  }
  else if (hasA !== hasB) {
    return hasB ? +1 : hasA ? -1 : 0;
  }
  else {
    var startA = nodeA.loc.start;
    var endA   = nodeA.loc.end;
    var startB = nodeB.loc.start;
    var endB   = nodeB.loc.end;
    return (endB < startA) ? -1 : (endA < startB) ? +1 : 0;
  }
}

/**
 * Get an <code>Array.forEach()</code> method that will apply the corresponding location from the given list.
 * @param {Array} locations A list of location objects to apply
 * @returns {function} A method suitable for <code>Array.forEach()</code>
 */
function applyLocToNode(locations) {
  return function eachNode(node, i) {
    var location = locations[i];
    if (location) {
      node.loc = location;
    } else {
      delete node.loc;
    }
  };
}
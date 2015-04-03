'use strict';

var codegen        = require('escodegen'),
    esprima        = require('esprima'),
    through        = require('through2'),
    convert        = require('convert-source-map'),
    sourceMapToAst = require('sourcemap-to-ast'),
    esmangle       = require('esmangle'),
    merge          = require('lodash.merge');

/**
 * Esprima based minifier transform for browserify.
 */
function esmangleify(opt) {

  // options is the escodegen format
  var format = merge({
    renumber   : true,
    hexadecimal: true,
    escapeless : true,
    compact    : true,
    semicolons : false,
    parentheses: false
  }, opt);

  // transform
  return function browserifyTransform(file) {
    var buffer = [];
    return through(transfrom, flush);

    function transfrom(data, encoding, done) {
      /* jshint validthis:true */
      buffer.push(data);
      done();
    }

    function flush(done) {
      /* jshint validthis:true */
      var content = buffer.join('');

      // parse code to AST using esprima
      var ast;
      try {
        ast = esprima.parse(content, {
          loc   : true,
          source: file
        });
      } catch(e) {
        return done(e);
      }

      // make sure the AST has the data from the original source map
      var converter     = convert.fromSource(content);
      var originalMap   = converter && converter.toObject();
      var sourceContent = content;
      if (originalMap) {
        sourceMapToAst(ast, originalMap);
        sourceContent = originalMap.sourcesContent[0];
      }

      // mangle the AST
      var updated = esmangle.mangle(ast);

      // generate compressed code from the AST
      var pair = codegen.generate(updated, {
        sourceMap        : true,
        sourceMapWithCode: true,
        format           : format
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

module.exports = esmangleify;

'use strict';

var fs              = require('fs'),
    path            = require('path');

var through         = require('through2'),
    merge           = require('lodash.merge'),
    trackFilenames  = require('gulp-track-filenames'),
    transformTools  = require('browserify-transform-tools'),
    browserify      = require('browserify'),
    convert         = require('convert-source-map'),
    gutil           = require('gulp-util'),
    minifyify       = require('minifyify'),
    slash           = require('gulp-slash'),
    bowerDir        = require('bower-directory');

/**
 * Test a given esprima AST node as a literal with one of the possible given values
 * @param {object} node The AST node
 * @param {...string} [candidates] Any number of possible values to test
 * @returns {boolean} True on valid node and valid match, else false
 */
function isLiteralAST(node) {
  var candidates = Array.prototype.slice.call(arguments, 1);
  return (node) && (node.type === 'Literal') && candidates.some(function (candidate) {
    return (node.value === candidate);
  });
}

/**
 * Test a given esprima AST node as a method with one of the possible given names
 * @param node The AST node
 * @param {object} node The AST node
 * @param {...string} [candidates] Any number of member names to test
 * @returns {boolean} True on valid node and valid match, else false
 */
function isMethodAST(node) {
  var candidates = Array.prototype.slice.call(arguments, 1);
  var result = (node) && (node.type === 'CallExpression') && (node.callee) && candidates.some(function (candidate) {
    var callee = node.callee;
    return ((callee.type === 'Identifier') && (callee.name === candidate)) ||
      ((callee.type === 'MemberExpression') && (callee.property) && (callee.property.name === candidate));
  });
  return result;
}

/**
 * Convert a symbol in jasmine describe(symbol...) and module(symbol...) into the full filename:line:col
 * @param symbol A text wildcard
 * @return A jasmine transform
 */
function jasmineTransform(symbol) {
  return transformTools.makeFalafelTransform('jasmineTransform', null, function jasmineASTWalker(node, options, done) {
    var isValid = isLiteralAST(node, symbol) && isMethodAST(node.parent, 'describe', 'module');
    if (isValid) {
      node.update('\'' + options.file.replace(/\\/g, '\\\\') + ':0:0\'');
    }
    done();
  });
}

/**
 * Use the given transforms to compile the files of the input stream.
 * Use the <code>sources</code> previously identified to satisfy any module imports.
 * @param {number} bannerWidth The width of banner comment, zero or omitted for none
 * @param {Array.<function>} transforms Any number of browserify transforms
 * @returns {stream.Through} A through stream that performs the operation of a gulp stream
 */
function compile(bannerWidth, transforms) {
  var output = [];

  /**
   * Flush the error queue to stdout
   */
  function flushErrors() {
    if (output.length > 0) {
      var width = Number(bannerWidth) || 0;
      var hr    = new Array(width + 1);   // this is a good trick to repeat a character N times
      var start = (width > 0) ? (hr.join('\u25BC') + '\n') : '';
      var stop  = (width > 0) ? (hr.join('\u25B2') + '\n') : '';
      process.stdout.write(start + '\n' + output.map(groupByFilename).join('') + '\n' + stop);
    }
  }

  /**
   * Mapping function that injects new-line return between dissimilar messages
   */
  function groupByFilename(value, i, array) {
    var current = String(value).split(/\:\d+/)[0];
    var previous = String(array[i - 1]).split(/\:\d+/)[0];
    var isDissimilar = (i > 0) && (i < array.length) && (current !== previous);
    var result = isDissimilar ? ('\n' + value) : value;
    return result;
  }

  /**
   * Compile any number of files into a bundle
   * @param {stream.Through} stream A stream to push files to
   * @param {Array.<string>|string} files Any number of files to bundle
   * @param {string} bundlename The name for the output file
   * @param {function|boolean} [minify] Determines whether minification is performed
   * @param {string} [sourceMapBase] Base path for source map file
   * @param {function} done Callback for completion
   */
  function bundle(stream, files, bundlename, minify, sourceMapBase, done) {

    /**
     * Determine the root relative form of the given file path.
     * If the file path is outside the project directory then just return its name.
     * @param {string} filePath The input path string
     * @param {number} An index for <code>Array.map()</code> type operations
     * @param {object} The array for <code>Array.map()</code> type operations
     * @return {string} The transformed file path
     */
    function rootRelative(filePath, i, array) {
      var rootRelPath = slash(path.relative(process.cwd(), path.resolve(filePath))); // resolve relative references
      var isProject   = (rootRelPath.slice(0, 2) !== '..');
      var result      = [
        sourceMapBase || '',
        isProject ? rootRelPath : path.basename(rootRelPath)
      ].join(path.sep);
      if ((typeof i === 'number') && (typeof array === 'object')) {
        array[i] = result;
      }
      return result;
    }

    // Simulate bower components (and optionally current project) as node modules that may be require()'d
    var anonymised = trackFilenames().create();
    function requireTransform(allowProjectRelative) {
      var BOWER = path.relative(process.cwd(), bowerDir.sync());
      return transformTools.makeRequireTransform('requireTransform', null, function (args, opts, done) {

        // transform the original path where relevant
        var original    = args[0];
        var split       = original.split(/[\\\/]/g);    // keep delimiters
        var firstTerm   = split.splice(0, 1)[0];        // remove the first term from the split
        var isTransform = (firstTerm.length) && !(/^\.{1,2}$/.test(firstTerm));
        var transformed = original;
        if (isTransform) {

          // current project
          var packageJson = (allowProjectRelative) && require(path.resolve('package.json'));
          if ((packageJson) && (typeof packageJson.name === 'string') && (packageJson.name === firstTerm)) {
            transformed = slash(path.resolve(path.join.apply(path, split)));  // full path to second term onwards

          // bower project
          } else {
            var partial   = path.dirname(original);
            var directory = (partial !== '.') && path.resolve(path.join(BOWER, partial));
            var isFound   = directory && fs.existsSync(directory) && fs.statSync(directory).isDirectory();
            if (isFound) {
              transformed = slash(path.resolve(path.join(BOWER, original)));  // path is within the bower directory
            }
          }
        }

        // record the final path for later anonymising
        //  we use an index that is padded to the same length as the filename
        //  we base36 encode the string because it is an easy way to save space
        var length     = transformed.length;
        var zeroPadded = ((new Array(length)).join('_') + (count++).toString(36).toUpperCase()).slice(-length);
        anonymised.define(zeroPadded, transformed);

        // complete
        done(null, 'require("' + transformed + '")');
      });
    }

    // setup
    var outPath  = path.resolve(bundlename);
    var mapPath  = path.basename(bundlename) + '.map';
    var isMinify = (minify) && ((typeof minify !== 'function') || minify(bundlename));
    var count    = 0;
    var bundler  = browserify({
      debug: true
    });

    // error handler
    var timeout;
    function errorHandler(error) {

      // run a bunch of tests against the error in order to determine the appropriate error message
      //  there will be at least one truthy value, even if that is the final placeholder
      var text    = error.toString();
      var message = [

        // SyntaxError: <file>:<reason>:<line>:<column>
        function testSyntaxError() {
          var analysis = /^\s*SyntaxError\:\s*([^:]*)\s*\:\s*([^(]*)\s*\((\d+:\d+)\)\s*\n/.exec(text);
          return analysis && ([analysis[1], analysis[3], analysis[2]].join(':') + '\n');
        },

        // Error: SyntaxError: <reason> while parsing json file <file>
        function testSyntaxErrorJSON() {
          var analysis = /^\s*Error: SyntaxError\:\s*(.*)\s*while parsing json file\s*([^]*)/.exec(text);
          return analysis && ([analysis[2], '0', '0', ' ' + analysis[1]].join(':') + '\n');
        },

        // Line <line>: <reason>: <file>
        function testGeneric() {
          var analysis = /Line\s*(\d+)\s*\:\s*([^:]*)\s*:\s*(.*)\s*/.exec(text);
          return analysis && ([analysis[3], analysis[1], 0, ' ' + analysis[2]].join(':') + '\n');
        },

        // Error: Cannot find module '<reason>' from '<directory>'
        //  find the first text match for any text quoted in <reason>
        function testBadImport() {
          var analysis = /^\s*Error\: Cannot find module '(.*)\'\s*from\s*\'(.*)\'\s*$/.exec(text);
          if (analysis) {
            var filename = fs.readdirSync(analysis[2])
              .filter(RegExp.prototype.test.bind(/\.js$/i))
              .filter(function (jsFilename) {
                var fullPath = path.join(analysis[2], jsFilename);
                var fileText = fs.readFileSync(fullPath).toString();
                return (new RegExp('[\'"]' + analysis[1] + '[\'"]')).test(fileText);
              })
              .shift();
            return path.join(analysis[2], filename) + ':0:0: Cannot find import ' + analysis[1] + '\n';
          }
        },

        // Unknown
        function otherwise() {
          return 'TODO parse this error\n' + text + '\n';
        }
      ]
        .map(function invokeTestMethod(testMethod) {
          return testMethod();
        })
        .filter(Boolean)
        .shift();

      // add unique
      if (output.indexOf(message) < 0) {
        output.push(message);
      }

      // complete overall only once there are no further errors
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        if (done) {
          done();
          done = null;
        }
      }, 100);
    }

    // stream output
    function pushFileToStream(path, text) {
      stream.push(new gutil.File({
        path    : path,
        contents: new Buffer(text)
      }));
    }

    // transforms
    transforms
      .concat(requireTransform(false))
      .forEach(function eachItem(item, i, list) {
        if (typeof item === 'function') {
          var opts = (typeof list[i+1] === 'object') ? merge({ global: true }, list[i+1]) : { global: true };
          bundler.transform(item, opts);
        }
      });

    // require statements
    [].concat(files)
      .forEach(function eachItem(item) {
        bundler.require(item, {entry: true});
      });

    // configure minification
    if (isMinify) {
      minifyify(bundler, {
        map      : mapPath,
        uglify   : {
          compress: { // anything that changes semicolons to commas will cause debugger problems
            sequences: false,
            join_vars: false // jshint ignore:line
          },
          mangle : {
            toplevel: true
          }
        }
      });
    }

    // when we use minification we will get: error, code, source-map
    // when we don't we will get: error, buffer(with embedded source map)
    bundler.bundle(function onComplete(error, codeOrBuffer, map) {
      if (!error) {
        var code      = codeOrBuffer.toString();
        var sourceMap = map ? JSON.parse(map) : convert.fromComment(code).toObject();
        var external  = map ? code : code.replace(convert.commentRegex, '//# sourceMappingURL=' + mapPath);
        var anonymous = isMinify ? anonymised.replace(external, '"', '"') : external;   // anonymise module paths
        delete sourceMap.file;
        delete sourceMap.sourcesContent;
        sourceMap.sources
          .forEach(rootRelative);
        pushFileToStream(outPath + '.map', JSON.stringify(sourceMap, null, 2));
        pushFileToStream(outPath, anonymous);
      }
      done(); // complete overall
    })
      .on('error', errorHandler);
  }

  // return a set of streams
  return {

    /**
     * A stream that produces a bundle for each file in the stream
     * @param {function|boolean} [isMinify] Determines whether minification is performed
     * @param {string} [sourceMapBase] Base path for source map file
     * @returns {stream.Through}
     */
    each: function gulpBundleEach(isMinify, sourceMapBase) {
      return through.obj(function transformFn(file, encoding, done) {
        bundle(this, [file.path], file.relative, isMinify, sourceMapBase, done);
      }, function flushFn(done) {
        flushErrors();
        done();
      });
    },

    /**
     * A stream that produces a bundle containing all files in the stream
     * @param {string} outPath A relative path for the output file
     * @param {function|boolean} [isMinify] Determines whether minification is performed
     * @param {string} [sourceMapBase] Base path for source map file
     * @returns {stream.Through}
     */
    all: function gulpBundleAll(outPath, isMinify, sourceMapBase) {
      var pending = [];
      return through.obj(function transformFn(file, encoding, done) {
        pending.push(file.path);
        done();
      }, function flushFn(done) {
        if (pending.length) {
          bundle(this, pending, outPath, isMinify, sourceMapBase, function () {
            flushErrors();
            done();
          });
        } else {
          done(); // no files
        }
      });
    }
  };
}

module.exports = {
  jasmineTransform: jasmineTransform,
  compile         : compile
};
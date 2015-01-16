var fs              = require('fs');
var path            = require('path');
var through         = require('through2');
var trackFilenames  = require('gulp-track-filenames');
var transformTools  = require('browserify-transform-tools');
var browserify      = require('browserify');
var gutil           = require('gulp-util');
var minifyify       = require('minifyify');
var moldSourceMap   = require('mold-source-map');
var slash           = require('gulp-slash');
var bowerDir        = require('bower-directory');

/**
 * Test a given esprima AST node as a literal with one of the possible given values
 * @param {object} node The AST node
 * @param {...string} [candidates] Any number of possible values to test
 * @returns {boolean} True on valid node and valid match, else false
 */
function isLiteralAST(node) {
  'use strict';
  var candidates = Array.prototype.slice.call(arguments, 1);
  return (node) && (node.type === 'Literal') && candidates.some(function (candidate) {
    return (node.value === candidate)
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
  'use strict';
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
  'use strict';
  return transformTools.makeFalafelTransform('jasmineTransform', null, function (node, options, done) {
    var isValid = isLiteralAST(node, symbol) && isMethodAST(node.parent, 'describe', 'module');
    if (isValid) {
      node.update('\'' + options.file + ':0:0\'');
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
  'use strict';
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
    var current      = String(value).split(/\:\d+/)[0];
    var previous     = String(array[i - 1]).split(/\:\d+/)[0];
    var isDissimilar = (i > 0) && (i < array.length) && (current !== previous);
    var result       = isDissimilar ? ('\n' + value) : value;
    return result;
  }

  /**
   * Determine the root relative form of the given file path.
   * If the file path is outside the project directory then just return its name.
   * @param {string} filePath Full file path
   * @returns {string} Give path relative to process.cwd()
   */
  function rootRelative(filePath) {
    var rootRelative = slash(path.relative(process.cwd(), filePath));
    var isProject    = (rootRelative.slice(0, 2) !== '..');
    return '/' + (isProject ? rootRelative : path.basename(rootRelative));
  }

  /**
   * Compile any number of files into a bundle
   * @param {stream.Through} stream A stream to push files to
   * @param {Array.<string>|string} files Any number of files to bundle
   * @param {string} bundlename The name for the output file
   * @param {function|boolean} [minify] Determines whether minification is performed
   * @param {function} done Callback for completion
   */
  function bundle(stream, files, bundlename, minify, done) {

    // Simulate bower components (and optionally current project) as node modules that may be require()'d
    var anonymised = trackFilenames().create();
    function requireTransform(allowProjectRelative) {
      'use strict';
      var BOWER = path.relative(process.cwd(), bowerDir.sync());
      return transformTools.makeRequireTransform('requireTransform', null, function (args, opts, done) {

        // transform the original path where relevent
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
            var directory = path.resolve(path.join(BOWER, path.dirname(original)));
            var isFound   = fs.existsSync(directory) && fs.statSync(directory).isDirectory();
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
    var cwd = process.cwd();
    var outPath = path.join(cwd, bundlename);
    var mapPath = path.basename(bundlename) + '.map';
    var isMinify = (minify) && ((typeof minify !== 'function') || minify(bundlename));
    var count = 0;
    var bundler = browserify({
      debug: true
    });

    // error handler
    var timeout;
    function errorHandler(error) {
      var text = error.toString();
      var analysis;
      var message;

      // SyntaxError: <file>:<reason>:<line>:<column>
      if (analysis = /^\s*SyntaxError\:\s*([^:]*)\s*\:\s*([^(]*)\s*\((\d+:\d+)\)\s*\n/.exec(text)) {
        message = [analysis[1], analysis[3], analysis[2]].join(':') + '\n';

      // Error: SyntaxError: <reason> while parsing json file <file>
      } else if (analysis = /^\s*Error: SyntaxError\:\s*(.*)\s*while parsing json file\s*([^]*)/.exec(text)) {
        message = [analysis[2], '0', '0', ' ' + analysis[1]].join(':') + '\n';

      // Error: Cannot find module '<reason>' from '<directory>'
      //  find the first text match for any text quoted in <reason>
      } else if (analysis = /^\s*Error\: Cannot find module '(.*)\'\s*from\s*\'(.*)\'\s*$/.exec(text)) {
        var filename = fs.readdirSync(analysis[2])
          .filter(RegExp.prototype.test.bind(/\.js$/i))
          .filter(function (jsFilename) {
            var fullPath = path.join(analysis[2], jsFilename);
            var fileText = fs.readFileSync(fullPath).toString();
            return (new RegExp('[\'"]' + analysis[1] + '[\'"]')).test(fileText);
          })
          .shift();
        message = path.join(analysis[2], filename) + ':0:0: ' + analysis[1] + '\n';

      // Unknown
      } else {
        message = 'TODO parse this error\n' + text + '\n';
      }

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
        cwd: cwd, base: cwd, path: path, contents: new Buffer(text)
      }));
    }

    // transforms
    transforms
      .concat(requireTransform(false))
      .filter(function (candidate) {
        return (typeof candidate === 'function');
      }).forEach(function (item) {
        bundler.transform(item, { global: true });
      });

    // require statements
    [].concat(files)
      .forEach(function (item) {
        bundler.require(item, {entry: true});
      });

    // minify requires callback style
    if (isMinify) {
      var minifyOptions = {
        map         : mapPath,
        compressPath: rootRelative,
        uglify      : {
          compress : { // anything that changes semicolons to commas will cause debugger problems
            sequences: false,
            join_vars: false
          }, mangle: {
            toplevel: true
          }
        }
      };
      minifyify(bundler, minifyOptions);
      bundler.bundle(function (error, code, map) {
        if (!error) {
          var sourcemap = JSON.parse(map);
          delete sourcemap.file;
          delete sourcemap.sourcesContent;
          pushFileToStream(outPath + '.map', JSON.stringify(sourcemap, null, 2));
          pushFileToStream(outPath, anonymised.replace(code, '"', '"'));   // anonymise module paths
        }
        done(); // complete overall
      }).on('error', errorHandler);

      // non-minify requires stream style
    } else {
      bundler.bundle()
        .on('error', errorHandler)
        .pipe(moldSourceMap.transform(function (molder, complete) {
          molder.mapSources(rootRelative);
          molder.sourcemap.setProperty('file');
          molder.sourcemap.setProperty('sourcesContent');
          molder.sourcemap.setProperty('sourceRoot');
          pushFileToStream(outPath + '.map', molder.sourcemap.toJSON(2));
          complete('//# sourceMappingURL=' + mapPath);
        })).on('data', function (contents) {
          pushFileToStream(outPath, contents);
          done(); // complete overall
        });
    }
  }

  // return a set of streams
  return {

    /**
     * A stream that produces a bundle for each file in the stream
     * @param {function|boolean} [isMinify] Determines whether minification is performed
     * @returns {stream.Through}
     */
    each: function (isMinify) {
      return through.obj(function (file, encoding, done) {
        bundle(this, [file.path], file.relative, isMinify, done);
      }, function (done) {
        flushErrors();
        done();
      });
    },

    /**
     * A stream that produces a bundle containing all files in the stream
     * @param {string} outPath A relative path for the output file
     * @param {function|boolean} [isMinify] Determines whether minification is performed
     * @returns {stream.Through}
     */
    all: function (outPath, isMinify) {
      var pending = [];
      return through.obj(function (file, encoding, done) {
        pending.push(file.path);
        done();
      }, function (done) {
        if (pending.length) {
          bundle(this, pending, outPath, isMinify, function () {
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
  compile:          compile
};
var path            = require('path');
var fs              = require('fs');
var through         = require('through2');
var trackFilenames  = require('gulp-track-filenames');
var transformTools  = require('browserify-transform-tools');
var browserify      = require('browserify');
var gutil           = require('gulp-util');
var es6ify          = require('es6ify');
var minifyify       = require('minifyify');
var moldSourceMap   = require('mold-source-map');
var slash           = require('gulp-slash');

/**
 * <p>Find a unique list of parameters of functions immediately preceded by annotation</p>
 */
function getAnnotatedParameters(annotation, text) {
  'use strict';
  var SPLIT       = /(\/\*|\*\/)/g; // split by and capture comments
  var FUNCTION    = /^[\r\n\s]*(?:(?:return|export|default|function)\s+)*(?:[\w\$]+\s*)?\(\s*([^\)]*)\s*\)[\r\n\s]*\{/m;
  var result      = [ ];
  var isComment   = false;
  var isAnnotated = false;
  text.split(SPLIT).forEach(function(value) {
    switch(value) {

      // start comment block (or commented comment, which will split the comment text)
      case '/*':
        isComment = true;
        break;

      // end comment block
      case '*/':
        isComment = false;
        break;

      // text between
      default:

        // where comment text is split any annotation is accepted
        if (isComment) {
          isAnnotated = isAnnotated || (value.indexOf(annotation) >= 0);

        // code text will not be split
        } else if (isAnnotated) {
          var analysis = FUNCTION.exec(value);
          if (analysis) {

            // add function parameters uniquely to the pending list
            analysis[1].split(/\s*,\s*/).forEach(function (candidate) {
              if (result.indexOf(candidate) < 0) {
                result.push(candidate);
              }
            });
          }
          isAnnotated = false;
        }
    }
  });
  return result;
}

/**
 * @param {number} [bannerWidth] The width of banner comment, zero or omitted for none
 */
module.exports = function (bannerWidth) {
  'use strict';
  var sourcesFwd = trackFilenames();
  var sourcesInt = trackFilenames();
  var reserved   = [ ];
  var count      = 0;
  var self       = {

    /**
     * Mark source files in preparation for <code>transpile</code>.
     * Outputs a stream of the same files.
     * @returns {stream.Through} A through stream that performs the operation of a gulp stream
     */
    sources: function () {
      var sessionFwd = sourcesFwd.create();
      var sessionInt = sourcesInt.create();
      return through.obj(function (file, encoding, done) {
        var importName = file.relative.replace(path.extname(file.path), '');
        var zeroPadded = ((new Array(file.path.length)).join('0') + String(count++)).slice(file.path.length * -1);
        sessionFwd.define(file.path, importName);
        sessionInt.define(zeroPadded, file.path);
        this.push(file);
        done();
      });
    },

    /**
     * Detect <code>@ngAnnotate</code> comments immediately preceding methods and reserve their parameters
     * @returns {stream.Through} A through stream that performs the operation of a gulp stream
     */
    reserve: function() {
      var logging = [ ];

      // detect @ngInject tags and reserve function parameters
      return through.obj(function(file, encoding, done) {
        var ANNOTATION = '@ngInject';
        var pending = getAnnotatedParameters(ANNOTATION, file.contents.toString());
        if (pending.length) {
          pending.sort();
          var importName = file.relative.replace(path.extname(file.path), '');
          logging.push([ ANNOTATION, importName, pending.join(', ') ]);
        }
        pending.forEach(function(candidate) {
          if (reserved.indexOf(candidate) < 0) {
            reserved.push(candidate);
          }
        });
        done(null, file);

      // report to console last so that we can equalise column widths
      }, function(done) {
        var columnWidths = [ ];
        logging.forEach(function(line) {
          line.forEach(function(column, i) {
            columnWidths[i] = Math.max(column.length, (columnWidths[i] || 0));
          });
        });
        logging.forEach(function(line) {
          line.forEach(function(column, i, array) {
            while (array[i].length < columnWidths[i]) {
              array[i] += ' ';
            }
          });
          gutil.log.apply(gutil, line);
        });
        done();
      });
    },

    /**
     * Create a transform that makes the given replacements in jasmine files
     * @param {object} replacements Replacement text keyed by the jasmine string to match
     * @returns {Function} A browserify transform
     */
    getJasmineTransform: function (replacements) {
      var expressions = { };
      if (typeof replacements === 'object') {
        for (var key in replacements) {
          var source = '((?:describe|module)\\s*\\(\\s*)(?:\'' + key + '\'|"' + key + '")';
          expressions[source] = replacements[key];
        }
      }
      return function(filename) {
        var text = '';
        return through.obj(function(contents, encoding, done) {
          text += contents.toString();
          done();
        }, function(done) {
          var lines = text.split('\n');
          for (var source in expressions) {
            var expression = new RegExp(source, 'g');
            var target     = expressions[source];
            for (var i = 0; i < lines.length; i++) {
              var analysis;
              do {
                analysis = expression.exec(lines[i]);
                if (analysis) {
                  var line     = i + 1;
                  var char     = expression.lastIndex - analysis[0].length;
                  var isMethod = (typeof target === 'function');
                  var value    = isMethod ? target(filename, line, char) : target;
                  lines[i] =
                    lines[i].slice(0, char) + analysis[1] +
                    '\'' + String(value).replace(/\\/g, '\\\\') + '\'' +
                    lines[i].slice(expression.lastIndex);
                }
              } while (analysis);
              expression.lastIndex = 0;
            }
          }
          this.push(new Buffer(lines.join('\n')));
          done();
        });
      };
    },

    /**
     * ES6ify transform
     */
    es6ifyTransform: require('es6ify'),

    /**
     * Convert import paths to absolute file paths
     */
    requireTransform: transformTools.makeRequireTransform('requireTransform', null, function(args, opts, done) {
      return done(null, 'require("' + sourcesFwd.replace(args[0], '^', '$') + '")');
    }),

    /**
     * Use <code>es6ify</code> to compile the files of the input stream.
     * Use the <code>sources</code> previously identified to satisfy any module imports.
     * @param {...string|function} transforms Any number of browserify transforms
     * @returns {stream.Through} A through stream that performs the operation of a gulp stream
     */
    compile: function () {
      var transforms = Array.prototype.slice.call(arguments);
      var output     = [ ];

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
        var previous     = String(array[i-1]).split(/\:\d+/)[0];
        var isDissimilar = (i > 0) && (i < array.length) && (current !== previous);
        var result       = isDissimilar ? ('\n' + value) : value;
        return result;
      }

      /**
       * Determine the root relative form of the given file path
       * @param {string} filePath Full file path
       * @returns {string} Give path relative to process.cwd()
       */
      function rootRelative(filePath) {
        return '/' + slash(path.relative(process.cwd(), filePath));
      }

      /**
       * Compile any number of files into a bundle
       * @param {stream.Through} stream A stream to push files to
       * @param {Array.<string>|string} files Any number of files to bundle
       * @param {string} bundlename The name for the output file
       * @param {function|boolean} [minifiy] Determines whether minification is performed
       * @param {function} done Callback for completion
       */
      function bundle(stream, files, bundlename, minifiy, done) {

        // setup
        var cwd      = process.cwd();
        var outPath  = path.join(cwd, bundlename);
        var mapPath  = path.basename(bundlename) + '.map';
        var isMinify = (minifiy) && ((typeof minifiy !== 'function') || minifiy(bundlename));
        var bundler  = browserify({
          debug: true
        });
        
        // error handler
        var timeout;
        function errorHandler(error) {
          var text = error.toString();
          var analysis;
          var message;

          // Error: <file>:<line>:<column>: <reason>
          if (analysis = /^\s*Error\:\s*(.*\:\d+:\d+\:\s*[^:]*).*\s*$/.exec(text)) {
            message = analysis[1] + '\n';

          // Error: <reason> from '<directory>'
          //  use the first js file encountered in the directory
          } else if (analysis = /^\s*Error\:\s*(.*)\s*from\s*\'(.*)\'\s*$/.exec(text)) {
            var filename = fs
              .readdirSync(analysis[2])
              .filter(RegExp.prototype.test.bind(/\.js$/i))
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
          timeout = setTimeout(function() {
            if (done) {
              done();
              done = null;
            }
          }, 100);
        }

        // stream output
        function pushFileToStream(path, text) {
          stream.push(new gutil.File({
            cwd: cwd,
            base: cwd,
            path: path,
            contents: new Buffer(text)
          }));
        }

        // transforms
        transforms.concat(self.requireTransform).forEach(function (item) {
          bundler.transform(item);
        });

        // require statements
        [ ].concat(files).forEach(function (item) {
          bundler.require(item, { entry: true });
        });

        // minify requires callback style
        if (isMinify) {
          minifyify(bundler, {
            map:          mapPath,
            compressPath: rootRelative,
            uglify: {
              compress: { // anything that changes semicolons to commas will cause debugger problems
                sequences: false,
                join_vars: false
              },
              mangle: {   // do not mangle reserved names
                toplevel: true,
                except:   reserved.join(',')
              }
            }
          });
          bundler.bundle(function (error, code, map) {
            if (!error) {
              var anonymised = sourcesInt.replace(code, '"', '"');  // anonymise module paths
              var sourcemap  = JSON.parse(map);
              delete sourcemap.file;
              delete sourcemap.sourcesContent;
              pushFileToStream(outPath + '.map', JSON.stringify(sourcemap, null, 2));
              pushFileToStream(outPath, anonymised);
            }
            done(); // complete overall
          })
            .on('error', errorHandler);

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
            }))
            .on('data', function (contents) {
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
            bundle(this, [ file.path ], file.relative, isMinify, done);
          }, function(done) {
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
          var pending = [ ];
          return through.obj(function (file, encoding, done) {
            pending.push(file.path);
            done();
          }, function (done) {
            if (pending.length) {
              bundle(this, pending, outPath, isMinify, function() {
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
  };
  return self;
};

/**
 * The relative path to the traceur runtime
 * @type {string}
 */
module.exports.RUNTIME = es6ify.runtime;

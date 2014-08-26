var path            = require('path');
var through         = require('through2');
var trackFilenames  = require('gulp-track-filenames');
var transformTools  = require('browserify-transform-tools');
var browserify      = require('browserify');
var gutil           = require('gulp-util');
var es6ify          = require('es6ify');
var moldSourceMap   = require('mold-source-map');

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
        var regexp  = /\/\*{2}[^]*@ngInject[^\/]*\*\/\n+.*\w+\s*\(\s*(.*)\s*\)\s*\{/gm;
        var text    = file.contents.toString();
        var pending = [ ];
        var analysis;
        do {
          analysis = regexp.exec(text);
          if (analysis) {
            analysis[1].split(/\s*,\s*/).forEach(function (candidate) {
              if (pending.indexOf(candidate) < 0) {
                pending.push(candidate);
              }
            });
          }
        } while(analysis);
        if (pending.length) {
          pending.sort();
          var filename = file.relative.replace(path.extname(file.path), '');
          logging.push([ '@ngInject', filename, pending.join(', ') ]);
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
    requireTransform: transformTools.makeRequireTransform("requireTransform", null, function(args, opts, done) {
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
          process.stdout.write(start + '\n' + output.join('\n\n') + '\n' + stop);
        }
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
        function errorHandler(error) {
          var REGEXP   = /^\s*Error\:\s*(.*\:\d+:\d+\:\s*[^:]*).*\s*$/;
          var analysis = REGEXP.exec(error.toString());
          var message  = analysis ? (analysis[1] + '\n') : ('TODO parse this error\n' + error + '\n');
          if (output.indexOf(message) < 0) {
            output.push(message);
          }
          done();
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
          require('minifyify')(bundler, {
            map:    mapPath,
            uglify: {
              mangle: {
                toplevel: true,
                except:   reserved.join(',')
              }
            }
          });
          bundler.bundle(function (error, code, map) {
            if (!error) {
              var anonymised = sourcesInt.replace(code, '"', '"');  // anonymise module paths
              var sourcemap  = JSON.parse(map);
              sourcemap.sources.forEach(function (file, i, array) {
                array[i] = '/' + path.relative(process.cwd(), file);
              });
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
              molder.mapSources(function map(file) {
                return '/' + path.relative(process.cwd(), file);
              });
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
            bundle(this, pending, outPath, isMinify, function() {
              flushErrors();
              done();
            });
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
module.exports.RUNTIME = es6ify.runtime.replace(process.cwd(), '').slice(1);

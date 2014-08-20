var path            = require('path');
var through         = require('through2');
var trackFilenames  = require('gulp-track-filenames');
var browserify      = require('browserify');
var gutil           = require('gulp-util');
var es6ify          = require('es6ify');

/**
 * @param {number?} bannerWidth The width of banner comment, zero or omitted for none
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
     * @param {...string|Array} Any number of explicit library path strings or arrays thereof
     * @returns {stream.Through} A through stream that performs the operation of a gulp stream
     */
    sources: function () {
      var sessionFwd = sourcesFwd.create();
      var sessionInt = sourcesInt.create();
      return through.obj(function (file, encoding, done) {
        var importName = file.relative.replace(path.extname(file.path), '');
        sessionFwd.define(file.path, importName);
        sessionInt.define(String(count++), file.path);
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
            })
          }
        } while(analysis);
        if (pending.length) {
          pending.sort();
          var filename = file.relative.replace(path.extname(file.path), '');
          logging.push([ '@ngInject', filename, pending.join(', ') ])
        }
        pending.forEach(function(candidate) {
          if (reserved.indexOf(candidate) < 0) {
            reserved.push(candidate);
          }
        })
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
          })
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
    jasminePreprocessor: function (replacements) {
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
              do {
                var analysis = expression.exec(lines[i]);
                if (analysis) {
                  var line     = i + 1;
                  var char     = expression.lastIndex - analysis[0].length;
                  var isMethod = (typeof target === 'function');
                  var value    = isMethod ? target(filename, line, char) : target;
                  lines[i] =
                    lines[i].slice(0, char) + analysis[1] +
                    '\'' + String(value) + '\'' +
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
     * A transform that resolves <code>require</code> statements to absolute paths
     */
    sourcesTransform: function(filename) {
      var text = '';
      return through.obj(function(contents, encoding, done) {
        text += contents.toString();
        done();
      }, function(done) {
        var lines = text.split('\n');
        for (var i = 0; i < lines.length; i++) {
          lines[i] = sourcesFwd.replace(lines[i], 'require\\(\'', '\'\\)');
        }
        this.push(new Buffer(lines.join('\n')));
        done();
      });
    },

    /**
     * Use <code>es6ify</code> to compile the files of the input stream.
     * Use the <code>sources</code> previously identified to satisfy any module imports.
     * @param {...string|function} transforms Any number of browserify transforms
     * @returns {stream.Through} A through stream that performs the operation of a gulp stream
     */
    compile: function () {
      var transforms = Array.prototype.slice.call(arguments)

      /**
       * Reporter for browserify errors
       * @param error The text of the error
       */
      function errorReporter(error) {

        // analyse the error
        var REGEXP   = /^\s*Error\:\s*(.*\:\d+:\d+\:\s*[^:]*).*\s*$/;
        var analysis = REGEXP.exec(error);
        var output   = (analysis) ? (analysis[1] + '\n') : ('TODO parse this error\n' + error + '\n');

        // output the error
        var width = Number(bannerWidth) || 0;
        var hr    = new Array(width + 1);   // this is a good trick to repeat a character N times
        var start = (width > 0) ? (hr.join('\u25BC') + '\n') : '';
        var stop  = (width > 0) ? (hr.join('\u25B2') + '\n') : '';
        process.stdout.write(start + '\n' + output + '\n' + stop);
      }

      /**
       * Compile any number of files into a bundle
       * @param {stream.Through} stream A stream to push files to
       * @param {Array.<string>|string} require Any number of files to bundle
       * @param {string} bundlename The name for the output file
       * @param {function|boolean} Determines whether mangle is performed
       * @param {function} done Callback for completion
       */
      function bundle(stream, require, bundlename, isMangle, done) {

        // setup
        var cwd      = process.cwd();
        var outPath  = path.join(cwd, bundlename);
        var mapPath  = './' + path.basename(bundlename) + '.map';
        var isMangle = (isMangle) && ((typeof isMangle !== 'function') || isMangle(require));
        var mangle   = isMangle && { toplevel: true, except: reserved.join(',') };

        // plugins
        var pending = browserify({ debug: true })
          .plugin('minifyify', {
            map:    mapPath,
            minify: { mangle: mangle }
          });

        // add transforms
        transforms.concat(self.sourcesTransform).forEach(function (item) {
          pending.transform(item);
        });

        // add require statements
        [ ].concat(require).forEach(function (item) {
          pending.require(item, { entry: true })
        });

        // stream
        pending.bundle(function (error, code, map) {
          if (error) {
            errorReporter(error.toString());
            this.end();
          } else {

            // remove paths (as quoted strings) from the module names
            var anonymised = sourcesInt.replace(code, '"', '"');
console.log(anonymised);
            stream.push(new gutil.File({
              cwd: cwd,
              base: cwd,
              path: outPath,
              contents: new Buffer(anonymised)
            }));

            // remove unused sourcemap fields
            var sourcemap = JSON.parse(map);
            sourcemap.sources.forEach(function (file, i, array) {
              array[i] = '/' + path.relative(process.cwd(), file);
            });
            delete sourcemap.file;
            delete sourcemap.sourcesContent;
            stream.push(new gutil.File({
              cwd: cwd,
              base: cwd,
              path: outPath + '.map',
              contents: new Buffer(JSON.stringify(sourcemap, null, 2))
            }));
          }
          done();
        });
      }

      // return a set of streams
      return {

        /**
         * A stream that produces a bundle for each file in the stream
         * @param {function|boolean} [mangle] Determines whether mangle is performed
         * @returns {stream.Through}
         */
        each: function (isMangle) {
          return through.obj(function (file, encoding, done) {
            bundle(this, [ file.path ], file.relative, isMangle, done);
          });
        },

        /**
         * A stream that produces a bundle containing all files in the stream
         * @param {string} outPath A relative path for the output file
         * @param {function|boolean} [mangle] Determines whether mangle is performed
         * @returns {stream.Through}
         */
        all: function (outPath, isMangle) {
          var pending = [ ];
          return through.obj(function (file, encoding, done) {
            pending.push(file.path);
            done();
          }, function (done) {
            bundle(this, pending, outPath, isMangle, done);
          });
        }
      }
    }
  };
  return self;
};

/**
 * The relative path to the traceur runtime
 * @type {string}
 */
module.exports.RUNTIME = es6ify.runtime.replace(process.cwd() + '/', '');

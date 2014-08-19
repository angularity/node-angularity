var path            = require('path');
var through         = require('through2');
var trackFilenames  = require('gulp-track-filenames');
var browserify      = require('browserify');
var moldSourceMap   = require('mold-source-map');
var moduleDeps      = require('module-deps');
var gutil           = require('gulp-util');
var es6ify          = require('es6ify');

/**
 *
 * @param {number?} bannerWidth The width of banner comment, zero or omitted for none
 */
module.exports = function (bannerWidth) {
  'use strict';
  var sources = trackFilenames();
  return {

    /**
     * Mark source files in preparation for <code>transpile</code>.
     * Outputs a stream of the same files.
     * @param {...string|Array} Any number of explicit library path strings or arrays thereof
     * @returns {stream.Through} A through stream that performs the operation of a gulp stream
     */
    sources: function () {
      var session = sources.create();
      return through.obj(function (file, encoding, done) {
        var importName = file.relative.replace(path.extname(file.path), '');
        session.define(file.path, importName);
        this.push(file);
        done();
      });
    },

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
     * Use <code>es6ify</code> to compile the files of the input stream.
     * Use the <code>sources</code> previously identified to satisfy any module imports.
     * @param {...string|function} transforms Any number of browserify transforms
     * @returns {stream.Through} A through stream that performs the operation of a gulp stream
     */
    compile: function () {
      var transforms = Array.prototype.slice.call(arguments)

      /**
       * Browserify plugin that initialises transforms and the file resolver
       * @param browserify The instance of browserify to decorate
       */
      function configurationPlugin(browserify) {
        browserify.pipeline.get('deps')
          .splice(0, 1, moduleDeps({
            transform: transforms,
            resolve: function (id, options, done) {
              done(null, sources.replace(id, '^', '$'));
            }
          }));
      }

      /**
       * The opposite of the resolve method
       * @param {vinyl.File} file A vinyl file
       */
      function unresolve(file) {
        return file.relative.replace(path.extname(file.path), '');
      }

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
       * @param {function} done Callback for completion
       */
      function bundle(stream, require, bundlename, done) {
        var cwd = process.cwd();
        var outPath = path.join(cwd, bundlename);
        var pending = browserify({ debug: true })
          .plugin(configurationPlugin);
        [ ].concat(require).forEach(function (item) {
          pending.require(item, { entry: true })
        });

        // stream
        pending
          .bundle()
          .on('error', function (error) {
            errorReporter(error.toString());
            this.end();
            done();
          })

          // source map
          .pipe(moldSourceMap.transform(function (molder, done) {
            molder.mapSources(function map(file) {
              return '/' + path.relative(process.cwd(), file);
            })
            molder.sourcemap.setProperty('file');
            molder.sourcemap.setProperty('sourcesContent');
            molder.sourcemap.setProperty('sourceRoot');
            stream.push(new gutil.File({
              cwd: cwd,
              base: cwd,
              path: outPath + '.map',
              contents: new Buffer(molder.sourcemap.toJSON(2))
            }));
            done('//# sourceMappingURL=./' + path.basename(bundlename) + '.map');
          }))

          // file contents
          .on('data', function (contents) {
            stream.push(new gutil.File({
              cwd: cwd,
              base: cwd,
              path: outPath,
              contents: new Buffer(contents)
            }));
            done(); // complete overall
          });
      }

      // return a set of streams
      return {

        /**
         * A stream that produces a bundle for each file in the stream
         * @returns {stream.Through}
         */
        each: function () {
          return through.obj(function (file, encoding, done) {
            bundle(this, [ unresolve(file) ], file.relative, done);
          });
        },

        /**
         * A stream that produces a bundle containing all files in the stream
         * @param {string} outPath A relative path for the output file
         * @returns {stream.Through}
         */
        all: function (outPath) {
          var pending = [ ];
          return through.obj(function (file, encoding, done) {
            pending.push(unresolve(file));
            done();
          }, function (done) {
            bundle(this, pending, outPath, done);
          });
        }
      }
    }
  };
};

/**
 * The relative path to the traceur runtime
 * @type {string}
 */
module.exports.RUNTIME = es6ify.runtime.replace(process.cwd() + '/', '');

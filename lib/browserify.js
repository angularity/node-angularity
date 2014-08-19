var path            = require('path');
var through         = require('through2');
var trackFilenames  = require('gulp-track-filenames');
var browserify      = require('browserify');
var moldSourceMap   = require('mold-source-map');
var moduleDeps      = require('module-deps');
var gutil           = require('gulp-util');

module.exports = function () {
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

    /**
     * Use <code>es6ify</code> to compile the files of the input stream.
     * Use the <code>sources</code> previously identified to satisfy any module imports.
     * @param {number?} bannerWidth The width of banner comment, zero or omitted for none
     * @returns {stream.Through} A through stream that performs the operation of a gulp stream
     */
    transpile: function (bannerWidth) {

      /**
       * Browserify plugin that initialises transforms and the file resolver
       * @param browserify The instance of browserify to decorate
       */
      function resolverPlugin(browserify) {
        browserify.pipeline.get('deps')
          .splice(0, 1, moduleDeps({
            transform: 'es6ify',
            resolve: function (id, options, done) {
              done(null, sources.replace(id));
            }
          }));
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

      // return a stream
      return through.obj(function(file, encoding, done) {
        var importName = file.relative.replace(path.extname(file.path), '');
        var baseName   = path.basename(file.path);
        var stream     = this;
        browserify({ debug: true })
          .plugin(resolverPlugin)
          .require(importName, { entry: true })
          .bundle()
          .on('error', function(error) {
            errorReporter(error.toString());
            this.end();
            done();
          })

          // source map
          .pipe(moldSourceMap.transform(function(molder, done) {
            molder.mapSources(moldSourceMap.mapPathRelativeTo(process.cwd()));
            molder.sourcemap.setProperty('file', baseName);
            molder.sourcemap.setProperty('sourcesContent');
            molder.sourcemap.setProperty('sourceRoot');
            stream.push(new gutil.File({
              cwd:      process.cwd,
              base:     file.base,
              path:     file.path + '.map',
              contents: new Buffer(molder.sourcemap.toJSON(2))
            }));
            done('//@ sourceMappingURL=' + baseName);
          }))

          // file contents
          .on('data', function(contents) {
            stream.push(new gutil.File({
              cwd:      process.cwd,
              base:     file.base,
              path:     file.path,
              contents: new Buffer(contents)
            }));
            done(); // complete overall
          });
      });
    }
  };
};

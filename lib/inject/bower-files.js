var bowerFiles = require('bower-files');
var combined   = require('combined-stream')
var gulp       = require('gulp');
var gutil      = require('gulp-util');
var spigot     = require('stream-spigot');
var path       = require('path');

/**
 * Retrieve version details of bower files as a stream
 * @returns {stream.Readable} A readable stream containing only the manifest file
 */
function manifest() {
  var cwd   = process.cwd();
  var bower = require(path.resolve('bower.json'));
  var json  = { };
  for (var key in bower.dependencies) {
    var dependency = require(path.resolve('bower_components/' + key + '/bower.json'))
    json[key] = dependency.version;
  }
  var text = '/*\n' + JSON.stringify(json, null, 2) + '\n*/';
  return spigot({ objectMode: true }, [
    new gutil.File({
      cwd:      cwd,
      base:     cwd,
      path:     path.join(cwd, 'manifest.json'),
      contents: new Buffer(text)
    })
  ]);
}

/**
 * @param {number?} bannerWidth The width of banner comment, zero or omitted for none
 */
module.exports = function (bannerWidth) {
  function error() {
    var width = Number(bannerWidth) || 0;
    var hr = new Array(width + 1);   // this is a good trick to repeat a character N times
    var start = (width > 0) ? (hr.join('\u25BC') + '\n') : '';
    var stop = (width > 0) ? (hr.join('\u25B2') + '\n') : '';
    process.stdout.write(start + '\nERROR: Mismatch between your bower.json and the installed packages.\n\n' + stop);
  }
  function getField(field, opts) {
    var parsed = bowerFiles(opts);

    /**
     * Get the given field with any arguments appended
     * @param {...string} Any number of additional paths
     */
    return function() {
      var additional = Array.prototype.slice.call(arguments);
      var value      = (parsed[field] || [ ]).concat(additional);
      return {

        /**
         * Retrieve the given field from <code>bower-files</code> package as a file stream.
         * @param {string} field The field to retrieve <code>js</code> or <code>css</code
         * @param {object} opts Options for <code>gulp.src()</code>
         * @return {stream.Readable} A readable stream of vinyl files, possibly empty
         */
        stream: function(opts) {
          if (!value.length) {
            error();
            var readable = spigot({ objectMode: true }, [ ]);
            readable._read = function () { };
            readable.push(null);
            return readable;
          } else if (opts.manifest) {
            return combined.create()
              .append(manifest())
              .append(gulp.src(value, opts));
          } else {
            return gulp.src(value, opts);
          }
        },

        /**
         * Retrieve the given field from <code>bower-files</code> package as a file list.
         * @param {string} field The field to retrieve <code>js</code> or <code>css</code
         * @return {Array.<Stream>} A list of file names, possibly empty
         */
        list: function() {
          if (!value.length) {
            error();
          }
          return value;
        }
      }
    }
  };

  // complete
  return {
    js:  getField('js', opts),
    css: getField('js', opts)
  };
}
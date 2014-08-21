var bowerFiles = require('bower-files');
var combined   = require('combined-stream')
var gulp       = require('gulp');
var gutil      = require('gulp-util');
var spigot     = require('stream-spigot');
var path       = require('path');
var fs         = require('fs');

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
  var before = [ ];
  var after  = [ ];
  function getField(field) {
    return function(options) {

      // get list
      var parsed = bowerFiles(options);
      var value  = before.concat(parsed[field] || [ ]).concat(after);

      // error handler
      if (!value.length) {
        var width = Number(bannerWidth) || 0;
        var hr = new Array(width + 1);   // this is a good trick to repeat a character N times
        var start = (width > 0) ? (hr.join('\u25BC') + '\n') : '';
        var stop = (width > 0) ? (hr.join('\u25B2') + '\n') : '';
        process.stdout.write(start + '\nERROR: Mismatch between your bower.json and the installed packages.\n\n' + stop);
      }

      // create result
      var stream;
      if (!value.length) {
        stream = spigot({ objectMode: true }, [ ]);
        stream._read = function () { };
        stream.push(null);
      } else if (options.manifest) {
        stream = combined.create()
          .append(manifest())
          .append(gulp.src(value, options));
      } else {
        stream = gulp.src(value, options);
      }

      // add the list to the stream
      stream.list = value;

      // complete
      return stream;
    }
  };
  function add(array) {
    return function() {
      var pending = [ ];
      Array.prototype.slice.call(arguments).forEach(function(arg) {
        if ((typeof arg === 'string') && fs.existsSync(arg)) {
          array.push(arg);
        }
      });
      return self;
    }
  };

  // complete
  var self = {

    /**
     * Retrieve javascript file list from the  <code>bower-files</code> package as a file stream
     * @param {object} Options for the stream
     */
    js: getField('js'),

    /**
     * Retrieve css file list from the <code>bower-files</code> package as a file stream
     * @param {object} Options for the stream
     */
    css: getField('css'),

    /**
     * Append any number of additional file paths to be used in any file lists that follow
     */
    prepend: add(before),

    /**
     * Append any number of additional file paths to be used in any file lists that follow
     */
    append: add(after)
  };
  return self;
}
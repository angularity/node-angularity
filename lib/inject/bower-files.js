var bowerFiles = require('bower-files');
var combined   = require('combined-stream');
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
  'use strict';
  function getJSON(filename) {
    return fs.existsSync(filename) && require(path.resolve(filename));
  }
  var bower = getJSON('bower.json');
  var deps  = (bower && bower.dependencies) || { };
  var json  = { };
  for (var key in deps) {
    var dependency = getJSON('bower_components/' + key + '/bower.json');
    if (dependency) {
      json[key] = dependency.version;
    }
  }
  var text = '/*\n' + JSON.stringify(json, null, 2) + '\n*/';
  var cwd  = process.cwd();
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
 * Simple merge of all the key-values of all the given associative arrays
 * @param {...object} candidates Any number of objects to combine
 * @return {object} The combination of key-values from the candidate object
 */
function merge() {
  'use strict';
  var result = { };
  Array.prototype.slice.call(arguments).map(function(option) {
    if (option && (typeof option === 'object')) {
      for (var key in option) {
        result[key] = option[key];
      }
    }
  });
  return result;
}

/**
 * @param {number?} bannerWidth The width of banner comment, zero or omitted for none
 * @param {object?} options Options for <code>bowerFiles()</code> and for <code>gulp.src()</code> stream
 */
module.exports = function (bannerWidth, options) {
  'use strict';
  var before = [ ];
  var after  = [ ];
  function getField(field) {
    return function(fieldOptions) {
      var finalOptions = merge(options, fieldOptions);
      var parsed = bowerFiles(finalOptions);

      // error
      if (parsed instanceof Error) {
        var width = Number(bannerWidth) || 0;
        var hr = new Array(width + 1);   // this is a good trick to repeat a character N times
        var start = (width > 0) ? (hr.join('\u25BC') + '\n') : '';
        var stop = (width > 0) ? (hr.join('\u25B2') + '\n') : '';
        process.stdout.write([
          start, '\n', 'Bower Error: ' + parsed.message + '\n', '\n', stop
        ].join(''));
      }

      // create result
      var bowerContent = field ? (parsed[field] || [ ]) : (parsed.js || [ ]).concat(parsed.css || [ ]);
      var value = before.concat(bowerContent).concat(after);
      var prepend = finalOptions.manifest ? manifest() : null;
      var stream;
      if (!value.length) {
        stream = spigot({ objectMode: true }, [ ]);
        stream._read = function () {
        };
        stream.push(null);
      } else if (prepend) {
        stream = combined.create().append(prepend).append(gulp.src(value, options));
      } else {
        stream = gulp.src(value, finalOptions);
      }

      // add the list to the stream
      stream.list = value;

      // complete
      return stream;
    };
  }
  function add(array) {
    return function() {
      Array.prototype.slice.call(arguments).forEach(function(arg) {
        if ((typeof arg === 'string') && fs.existsSync(arg)) {
          array.push(arg);
        }
      });
      return self;
    };
  }

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
     * Retrieve javascript and css file list from the <code>bower-files</code> package as a file stream
     * @param {object} Options for the stream
     */
    all: getField(),

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
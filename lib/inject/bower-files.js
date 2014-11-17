var combined = require('combined-stream');
var gulp     = require('gulp');
var gutil    = require('gulp-util');
var spigot   = require('stream-spigot');
var path     = require('path');
var defaults = require('lodash.defaults');
var fs       = require('fs');

function json() {
  'use strict';
  function read(filename) {
    try {
      return fs.existsSync(filename) && require(path.resolve(filename));
    } catch(error) {
      gutil.log('Error parsing bower.json at ' + filename)
    }
  }
  var bower  = read('bower.json');
  var deps   = (bower && bower.dependencies) || { };
  var result = { };
  for (var key in deps) {
    result[key] = read(path.join('bower_components', key, 'bower.json'));
  }
  return result;
}

/**
 * Retrieve version details of bower files as a stream
 * @param {boolean} useComment Determines whether the output is wrapped in a comment
 * @returns {stream.Readable} A readable stream containing only the manifest file
 */
function manifest(useComment) {
  'use strict';
  var bower    = json();
  var versions = { };
  for (var key in bower) {
    versions[key] = bower[key].version;
  }
  var text      = JSON.stringify(versions, null, 2);
  var commented = (useComment) ? [ '/*', text, '*/' ].join('\n') : text;
  var cwd       = process.cwd();
  return spigot({ objectMode: true }, [
    new gutil.File({
      cwd:      cwd,
      base:     cwd,
      path:     path.join(cwd, 'manifest.json'),
      contents: new Buffer(commented)
    })
  ]);
}

module.exports = function () {
  'use strict';
  var before  = [ ];
  var after   = [ ];

  /**
   * @param {string|RegExp} pattern Matches the extension of bower files
   * @param {object?} options Options for <code>gulp.src()</code> stream
   */
  function src(pattern, options) {
    options = options || { };

    // create result list
    //  the parsed content will be sorted by extension
    var parsed       = json();
    var bowerContent = [ ];
    for (var packageName in parsed) {
      var base   = null;
      var config = parsed[packageName];
      var files   = [ ];
      [ ]
        .concat(config.main)
        .map(function (relative) {
          return path.resolve(path.join('bower_components', packageName, ''), relative);
        })
        .forEach(function (absolute) {
          var ext       = path.extname(absolute).slice(1);
          var isInclude = ((typeof pattern === 'string') && (pattern === ext)) ||
            ((typeof pattern === 'object') && ('test' in pattern) && pattern.test(ext)) ||
            (pattern === '*');
          if (isInclude) {
            if (base) {
              for (var i = 0; (base[i] === absolute[i]); i++);
              base = base.slice(0, i);
            } else if (options.base === true) {
              base = path.dirname(absolute);
            }
            files.push(absolute);
          }
        });
      if (files.length) {
        files.options = defaults({ base: base || process.cwd() }, options);
        bowerContent.push(files);
      }
    }
    var value   = before.concat(bowerContent).concat(after);
    var prepend = options.manifest && manifest(options.manifest === 'comment');

    // represent list as a readable stream
    var stream;
    if (!value.length) {
      stream       = spigot({ objectMode: true }, [ ]);
      stream._read = function () { };
      stream.push(null);
    } else {
      stream = combined.create();
      (prepend) && stream.append(prepend);
      bowerContent.forEach(function (files) {
        stream.append(gulp.src(files.concat(), files.options));
      });
    }

    // add the list to the stream as a sidecar
    stream.list = value;

    // complete
    return stream;
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
     * Append any number of additional file paths to be used in any file lists that follow
     */
    prepend: add(before),

    /**
     * Append any number of additional file paths to be used in any file lists that follow
     */
    append: add(after),

    /**
     * Retrieve all or some bower files as listed in the package <code>main</code> parameter
     * @param {object} Options for the stream
     */
    src: src
  };
  return self;
}
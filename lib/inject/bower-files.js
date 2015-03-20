'use strict';

var combined = require('combined-stream'),
    gulp     = require('gulp'),
    gutil    = require('gulp-util'),
    spigot   = require('stream-spigot'),
    defaults = require('lodash.defaults'),
    flatten  = require('lodash.flatten'),
    through  = require('through2'),
    path     = require('path'),
    fs       = require('fs');

/**
 * Retrieve version details of bower files as a stream
 * @param {boolean} useComment Determines whether the output is wrapped in a comment
 * @param {boolean} includeDev Determines whether dev dependencies are included
 * @returns {stream.Readable} A readable stream containing only the manifest file
 */
function json(includeDev) {
  function read(filename) {
    try {
      return fs.existsSync(filename) && require(path.resolve(filename));
    } catch(error) {
      gutil.log('Error parsing bower.json at ' + filename);
    }
  }
  var bower  = read('bower.json');
  var deps   = bower ? defaults(bower.dependencies, (includeDev && bower.devDependencies)) : { };
  var result = { };
  for (var key in deps) {
    result[key] = read(path.join('bower_components', key, 'bower.json'));
  }
  return result;
}

/**
 * Retrieve version details of bower files as a stream
 * @param {boolean} useComment Determines whether the output is wrapped in a comment
 * @param {boolean} includeDev Determines whether dev dependencies are included
 * @returns {stream.Readable} A readable stream containing only the manifest file
 */
function manifest(useComment, includeDev) {
  var bower    = json(includeDev);
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
  var before  = [ ];
  var after   = [ ];

  /**
   * @param {string|RegExp} pattern Matches the extension of bower files
   * @param {object?} options Options for <code>gulp.src()</code> stream
   */
  function src(pattern, options) {
    options = options || { };

    function testExtension(filename) {
      var ext = path.extname(filename).slice(1);
      return (
        ((typeof pattern === 'string') && (pattern.split('|').indexOf(ext) >= 0)) ||
        ((typeof pattern === 'object') && ('test' in pattern) && pattern.test(ext)) ||
        (pattern === '*')
      );
    }

    function toAbsolute(relative) {
      return path.resolve(path.join('bower_components', packageName, ''), relative);
    }

    function greatestCommonBase(absolute) {
      if (base) {
        var i = 0;
        while(base[i] === absolute[i]) {
          i++;
        }
        base = base.slice(0, i);
      } else if (options.base === true) {
        base = path.dirname(absolute);
      }
    }

    // create result list
    //  the parsed content will be sorted by extension
    var parsed        = json(options.dev);
    var bowerPackages = [ ];
    for (var packageName in parsed) {
      var config       = parsed[packageName];
      var bowerPackage = [ ]
        .concat(config.main)
        .filter(Boolean)
        .map(toAbsolute)
        .filter(testExtension);
      if (bowerPackage.length) {
        var base = null;
        bowerPackage.forEach(greatestCommonBase);
        bowerPackage.options = defaults({ base: base || options.base }, options);  // use our base over that given
        bowerPackage.name    = packageName;
        bowerPackages.push(bowerPackage);
      }
    }
    var value   = before.concat(bowerPackages).concat(after);
    var prepend = options.manifest && manifest(options.manifest === 'comment', options.dev);

    // represent list as a readable stream
    var stream;
    if (!value.length) {

      // degenerate stream
      stream       = spigot({ objectMode: true }, [ ]);
      stream._read = function () { };
      stream.push(null);

    } else {

      // combination of source streams with specific base path for each package
      stream = combined.create();
      if (prepend) {
        stream.append(prepend);
      }
      value.forEach(function (bowerPackage) {
        var src = gulp.src(bowerPackage.concat(), bowerPackage.options)
          .pipe(through.obj(function(file, encoding, done) {
            if ((options.base === true) && (bowerPackage.name)) {
              file.path = path.join(file.base, bowerPackage.name, file.relative);
            }
            this.push(file);
            done();
          }));
        stream.append(src);
      });
    }

    // add the list to the stream as a sidecar
    stream.list = flatten(value);

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
};
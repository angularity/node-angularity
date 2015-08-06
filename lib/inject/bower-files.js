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
 * @param {string|RegExp} pattern Matches the extension of bower files
 * @param {object?} options Options for <code>gulp.src()</code> stream
 */
module.exports = function src(pattern, options) {
  options = options || {};

  // create result list
  //  the parsed content will be sorted by extension
  var parsed        = json(options.dev),
      manifestFile  = !!options.manifest && manifest(options.manifest === 'comment', options.dev),
      bowerPackages = [];
  for (var packageName in parsed) {
    var config = parsed[packageName],
        list   = []
          .concat(config.main)
          .filter(Boolean)
          .map(toAbsoluteForPackage(packageName))
          .filter(testExtension);
    if (list.length) {
      var base = list.reduce(greatestCommonBase, null);
      bowerPackages.push({
        name   : packageName,
        options: defaults({base: base || options.base}, options),  // use our base over that given
        list   : list
      });
    }
  }

  // represent list as a readable stream, even if empty
  var stream;

  //  degenerate stream
  if (!bowerPackages.length) {
    stream = spigot({objectMode: true}, []);
    stream._read = function () {
    };
    stream.push(null);
  }
  //  combination of source streams with specific base path for each package
  else {
    stream = combined.create();
    if (manifestFile) {
      stream.append(manifestFile);
    }
    bowerPackages.reduce(eachPackage, stream);
  }

  // add the list to the stream as a sidecar
  stream.list = flatten(bowerPackages);

  // complete
  return stream;

  function greatestCommonBase(candidate, absolute) {
    if (candidate) {
      var i = 0;
      while (candidate[i] === absolute[i]) {
        i++;
      }
      return candidate.slice(0, i);
    } else if (options.base === true) {
      return path.dirname(absolute);
    } else {
      return null;
    }
  }

  function eachPackage(stream, bowerPackage) {
    return stream.append(
      gulp.src(bowerPackage.list, bowerPackage.options)
        .pipe(through.obj(transform))
    );

    function transform(file, encoding, done) {
      /* jshint validthis:true */
      if ((options.base === true) && (bowerPackage.name)) {
        file.path = path.join(file.base, bowerPackage.name, file.relative);
      }
      this.push(file);
      done();
    }
  }

  function testExtension(filename) {
    var ext = path.extname(filename).slice(1);
    return (
      ((typeof pattern === 'string') && (pattern.split('|').indexOf(ext) >= 0)) ||
      ((typeof pattern === 'object') && ('test' in pattern) && pattern.test(ext)) ||
      (pattern === '*')
    );
  }
};

function toAbsoluteForPackage(packageName) {
  return function toAbsolute(relative) {
    return path.resolve(path.join('bower_components', packageName, ''), relative);
  };
}

/**
 * Retrieve version details of bower files as a stream
 * @param {boolean} useComment Determines whether the output is wrapped in a comment
 * @param {boolean} includeDev Determines whether dev dependencies are included
 * @returns {stream.Readable} A readable stream containing only the manifest file
 */
function json(includeDev) {
  return processBowerJson(read('bower.json'), includeDev);

  function read(filename) {
    try {
      return fs.existsSync(filename) && require(path.resolve(filename));
    } catch (error) {
      gutil.log('Error parsing bower.json at ' + filename);
    }
  }

  function processBowerJson(json, includeDev) {
    var isValid      = (json && (typeof json === 'object')),
        dependencies = isValid && defaults(json.dependencies, includeDev && json.devDependencies) || {};
    return Object.keys(dependencies)
      .reduce(reduceDeps, {});
  }

  function reduceDeps(result, key) {
    var contents = read(path.join('bower_components', key, 'bower.json'));
    defaults(result, processBowerJson(contents, false));  // current items' dependencies precede the current item
    result[key] = contents;
    return result;
  }
}

/**
 * Retrieve version details of bower files as a stream
 * @param {boolean} useComment Determines whether the output is wrapped in a comment
 * @param {boolean} includeDev Determines whether dev dependencies are included
 * @returns {stream.Readable} A readable stream containing only the manifest file
 */
function manifest(useComment, includeDev) {
  var bower    = json(includeDev),
      versions = {};
  for (var key in bower) {
    versions[key] = bower[key].version;
  }
  var text      = JSON.stringify(versions, null, 2),
      commented = (useComment) ? ['/*', text, '*/'].join('\n') : text,
      cwd       = process.cwd();
  return spigot({objectMode: true}, [
    new gutil.File({
      cwd     : cwd,
      base    : cwd,
      path    : path.join(cwd, 'manifest.json'),
      contents: new Buffer(commented)
    })
  ]);
}
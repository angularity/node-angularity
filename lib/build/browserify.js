'use strict';

var fs              = require('fs'),
    path            = require('path');

var through         = require('through2'),
    q               = require('q'),
    merge           = require('lodash.merge'),
    transformTools  = require('browserify-transform-tools'),
    browserify      = require('browserify'),
    watchify        = require('watchify'),
    convert         = require('convert-source-map'),
    gutil           = require('gulp-util'),
    slash           = require('gulp-slash'),
    bowerDir        = require('bower-directory');

/**
 * Create a context with the given options.
 * @param {object} opt A hash of options
 * @returns {{each:function, all:function} A set of gulp plugins that operate with the given context
 */
function create(opt) {

  // ensure options
  var options = merge({
    anonymous      : false,
    bowerRelative  : false,
    projectRelative: false,
    transforms     : [],
    sourceMapBase  : null
  }, opt);

  // multiton instances within this collection
  var instances = {};

  // return some gulp plugins
  return {
    each: each,
    all : all
  };

  /**
   * A stream that produces a bundle for each file in the stream
   * @returns {stream.Through}
   */
  function each() {
    var messages = [];

    function transform(file, encoding, done) {
      /* jshint validthis:true */
      getInstance(file.path)
        .bundle(this, file.relative)
        .catch(function onError(errors) {
          messages.push.apply(messages, errors);
        })
        .finally(done);
    }

    function flush(done) {
      printMessages(messages);
      done();
    }

    return through.obj(transform, flush);
  }

  /**
   * A stream that produces a bundle containing all files in the stream
   * @param {string} outPath A relative path for the output file
   * @returns {stream.Through}
   */
  function all(outPath) {
    var files = [];

    function transform(file, encoding, done) {
      files.push(file.path);
      done();
    }

    function flush(done) {
      /* jshint validthis:true */
      if (files.length) {
        getInstance(files)
          .bundle(this, outPath)
          .catch(printMessages)
          .finally(done);
      } else {
        done(); // no files
      }
    }

    return through.obj(transform, flush);
  }

  /**
   * Get an instance of the multiton that match the given files in any order
   * @param {Array.<string>|string} fileOrFiles A file path or array thereof
   * @returns {{bundle: function}} An instance for the given files
   */
  function getInstance(fileOrFiles) {
    var files = [].concat(fileOrFiles);
    var key   = JSON.stringify(files.sort());
    if (key in instances) {
      return instances[key];
    } else {
      var instance = instances[key] = createInstance(files);
      return instance;
    }
  }

  /**
   * Create an instance of the multiton that closes a fixed set of files
   * @param files
   */
  function createInstance(files) {

    // initialise with a shared watchify cache
    var instanceOptions = merge({
      debug      : true,
      ignoreWatch: /.*/
    }, watchify.args);
    var bundler = watchify(browserify(instanceOptions));

    // ensure anonymous module paths when we are minifying
    if (options.anonymous) {
      bundler.pipeline
        .get('label')
        .push(anonymousLabeler());
    }

    // transforms with possible options
    //  transform, [opt], transform, [opt], ...
    [].concat(options.transforms)
      .concat(requireTransform(options.bowerRelative, options.projectRelative))
      .forEach(function eachItem(item, i, list) {
        if (typeof item === 'function') {
          var opts = (typeof list[i + 1] === 'object') ? merge({global: true}, list[i + 1]) : {global: true};
          bundler.transform(item, opts);
        }
      });

    // require statements
    [].concat(files)
      .forEach(function eachItem(item) {
        bundler.require(item, {entry: true});
      });

    // create instance
    return {
      bundle: bundle
    };

    /**
     * Compile any number of files into a bundle
     * @param {stream.Through} stream A stream to push files to
     * @param {Array.<string>|string} files Any number of files to bundle
     * @param {string} bundleName The name for the output file
     * @param {function} done Callback for completion
     */
    function bundle(stream, bundleName) {

      // create a promise
      var deferred = q.defer();

      // setup
      var outPath = path.resolve(bundleName);
      var mapPath = path.basename(bundleName) + '.map';
      var errors  = [];
      var timeout;

      // compile
      bundler.bundle()
        .on('error', errorHandler)
        .pipe(outputStream());

      // return the promise
      return deferred.promise;

      // handle an error in the context of the timeout
      function errorHandler(error) {

        // parse the error text
        var message = parseError(error.toString());

        // add unique
        if (errors.indexOf(message) < 0) {
          errors.push(message);
        }

        // complete overall only once there are no further errors
        //  ensure idempotent in the case there are some late errors
        clearTimeout(timeout);
        timeout = setTimeout(onTimeout, 100);
      }

      // error has occurred and a delay has passed with no further errors
      function onTimeout() {
        deferred.reject(errors);  // complete overall
      }

      // handle the output of the bundler (as a stream)
      function outputStream() {
        var code = '';

        function transform(buffer, encoding, done) {
          code += buffer.toString();  // accumulate code
          done();
        }

        function flush(done) {
          var sourceMap = convert.fromComment(code).toObject();
          var external = code.replace(convert.commentRegex, '//# sourceMappingURL=' + mapPath);
          delete sourceMap.file;
          delete sourceMap.sourceRoot;
          delete sourceMap.sourcesContent;
          sourceMap.sources
            .forEach(rootRelative);
          pushFileToStream(outPath + '.map', JSON.stringify(sourceMap, null, 2));
          pushFileToStream(outPath, external);
          done();
          deferred.resolve();   // complete overall
        }

        return through.obj(transform, flush);
      }

      // stream output
      function pushFileToStream(path, text) {
        stream.push(new gutil.File({
          path    : path,
          contents: new Buffer(text)
        }));
      }
    }

    /**
     * Determine the root relative form of the given file path.
     * If the file path is outside the project directory then just return its name.
     * @param {string} filePath The input path string
     * @param {number} An index for <code>Array.map()</code> type operations
     * @param {object} The array for <code>Array.map()</code> type operations
     * @return {string} The transformed file path
     */
    function rootRelative(filePath, i, array) {
      var rootRelPath = slash(path.relative(process.cwd(), path.resolve(filePath))); // resolve relative references
      var isProject = (rootRelPath.slice(0, 2) !== '..');
      var result = [
        options.sourceMapBase || '',
        isProject ? rootRelPath : path.basename(rootRelPath)
      ].join('/');
      if ((typeof i === 'number') && (typeof array === 'object')) {
        array[i] = result;
      }
      return result;
    }
  }
}

/**
 * A pipeline labeler that ensures that final file names are anonymousd in the final output
 * @returns {stream.Through} A through stream for the labelling stage
 */
function anonymousLabeler() {
  return through.obj(function (row, enc, next) {
    Object.keys(row.deps).forEach(function (key) {
      var value = row.deps[key];
      row.deps[String(value)] = value;
      row.source = row.source
        .split(key)
        .join(value);
      delete row.deps[key];
    });
    this.push(row);
    next();
  });
}

/**
 * A require transform that simulates bower components (and optionally current project) as node modules
 * @param {boolean} allowBowerRelative Determines whether bower relative require is possible
 * @param {boolean} allowProjectRelative Determines whether root relative require is possible
 */
function requireTransform(allowBowerRelative, allowProjectRelative) {
  var BOWER = path.relative(process.cwd(), bowerDir.sync());
  return transformTools.makeRequireTransform('requireTransform', null, function transform(args, opts, done) {

    // find the original path and transform it so log as it is not relative
    var original    = args[0];
    var split       = original.split(/[\\\/]/g);    // keep delimiters
    var firstTerm   = split.splice(0, 1).shift();   // remove the first term from the split
    var isTransform = (firstTerm.length) && !(/^\.{1,2}$/.test(firstTerm));

    // first valid result wins
    //  if we are not transforming then we fall back to the original value
    var transformed = [

        // current project
        isTransform && allowProjectRelative && function resolveProjectRelative() {
          var packageJson = require(path.resolve('package.json'));
          if ((typeof packageJson.name === 'string') && (packageJson.name === firstTerm)) {
            return slash(path.resolve(path.join.apply(path, split)));  // full path to second term onwards
          }
        },

        // bower project
        isTransform && allowBowerRelative && function resolveBowerRelative() {
          var partial   = path.dirname(original);
          var directory = (partial !== '.') && path.resolve(path.join(BOWER, partial));
          var isFound   = directory && fs.existsSync(directory) && fs.statSync(directory).isDirectory();
          if (isFound) {
            return slash(path.resolve(path.join(BOWER, original)));  // path is within the bower directory
          }
        },

        // fall back value
        original
      ]
        .map(function (candidate) {
          return (typeof candidate === 'function') ? candidate() : candidate;
        })
        .filter(Boolean)
        .shift();

    // update
    done(null, 'require("' + transformed + '")');
  });
}

/**
 * Flush the error queue to stdout
 * @param {Array} messages Any number of error messages
 */
function printMessages(messages) {
  if (messages.length > 0) {

    // push the buffer to stdout in a single block
    var width   = Number(80) || 0;
    var hr      = new Array(width + 1);   // this is a good trick to repeat a character N times
    var start   = (width > 0) ? (hr.join('\u25BC') + '\n') : '';
    var stop    = (width > 0) ? (hr.join('\u25B2') + '\n') : '';
    var message = messages
      .map(groupByFilename)
      .join('');
    process.stdout.write([start, message, stop].join('\n'));

    // reset given buffer
    messages = [];
  }
}

/**
 * Mapping function that injects new-line return between dissimilar messages
 */
function groupByFilename(value, i, array) {
  var current      = String(value).split(/\:\d+/)[0];
  var previous     = String(array[i - 1]).split(/\:\d+/)[0];
  var isDissimilar = (i > 0) && (i < array.length) && (current !== previous);
  var result       = isDissimilar ? ('\n' + value) : value;
  return result;
}

/**
 * Convert error text to a more sensible error message
 * @param {string} text Error text
 * @return {string} The most relevant error message parsed from the text
 */
function parseError(text) {

  // run a bunch of tests against the error in order to determine the appropriate error message
  //  there will be at least one truthy value, even if that is the final placeholder
  return [

    // SyntaxError: <file>:<reason>:<line>:<column>
    function testSyntaxError() {
      var analysis = /^\s*SyntaxError\:\s*([^:]*)\s*\:\s*([^(]*)\s*\((\d+:\d+)\)\s*\n/.exec(text);
      return analysis && ([analysis[1], analysis[3], analysis[2]].join(':') + '\n');
    },

    // Error: SyntaxError: <reason> while parsing json file <file>
    function testSyntaxErrorJSON() {
      var analysis = /^\s*Error: SyntaxError\:\s*(.*)\s*while parsing json file\s*([^]*)/.exec(text);
      return analysis && ([analysis[2], '0', '0', ' ' + analysis[1]].join(':') + '\n');
    },

    // Line <line>: <reason>: <file>
    function testGeneric() {
      var analysis = /Line\s*(\d+)\s*\:\s*([^:]*)\s*:\s*(.*)\s*/.exec(text);
      return analysis && ([analysis[3], analysis[1], 0, ' ' + analysis[2]].join(':') + '\n');
    },

    // Error: Cannot find module '<reason>' from '<directory>'
    //  find the first text match for any text quoted in <reason>
    function testBadImport() {
      var analysis = /^\s*Error\: Cannot find module '(.*)\'\s*from\s*\'(.*)\'\s*$/.exec(text);
      if (analysis) {
        var filename = fs.readdirSync(analysis[2])
          .filter(RegExp.prototype.test.bind(/\.js$/i))
          .filter(function (jsFilename) {
            var fullPath = path.join(analysis[2], jsFilename);
            var fileText = fs.readFileSync(fullPath).toString();
            return (new RegExp('[\'"]' + analysis[1] + '[\'"]')).test(fileText);
          })
          .shift();
        return path.join(analysis[2], filename) + ':0:0: Cannot find import ' + analysis[1] + '\n';
      }
    },

    // Unknown
    function otherwise() {
      return 'TODO parse this error\n' + text + '\n';
    }
  ]
    .map(function invokeTestMethod(testMethod) {
      return testMethod();
    })
    .filter(Boolean)
    .shift();
}

module.exports = create;
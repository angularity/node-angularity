'use strict';

var path              = require('path'),
    fs                = require('fs'),
    through           = require('through2'),
    sass              = require('node-sass'),
    gutil             = require('gulp-util'),
    slash             = require('gulp-slash'),
    rework            = require('rework'),
    visit             = require('rework-visit'),
    convert           = require('convert-source-map'),
    SourceMapConsumer = require('source-map').SourceMapConsumer,
    mime              = require('mime'),
    crypto            = require('crypto'),
    defaults          = require('lodash.defaults');

/**
 * Search for the relative file reference from the <code>startPath</code> up to the process
 * working directory, avoiding any other directories with a <code>package.json</code> or <code>bower.json</code>.
 * @param {string} startPath The location of the uri declaration and the place to start the search from
 * @param {string} uri The content of the url() statement, expected to be a relative file path
 * @returns {string} the full file path of the file where found or <code>null</code> otherwise
 */
function findFile(startPath, uri) {

  /**
   * Test whether the given directory is the root of its own package
   * @param {string} absolutePath An absolute path
   * @returns {boolean} True where a package.json or bower.json exists, else False
   */
  function notPackage(absolutePath) {
    return ['package.json', 'bower.json'].every(function fileNotFound(file) {
      return !(fs.existsSync(path.resolve(absolutePath, file)));
    });
  }

  /**
   * Enqueue subdirectories that are not packages and are not in the root path
   * @param {Array} queue The queue to add to
   * @param {string} basePath The path to consider
   */
  function enqueue(queue, basePath) {
    fs.readdirSync(basePath)
      .filter(function notHidden(filename) {
        return (filename.charAt(0) !== '.');
      })
      .map(function toAbsolute(filename) {
        return path.join(basePath, filename);
      })
      .filter(function directoriesOnly(absolutePath) {
        return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory();
      })
      .filter(function notInRootPath(absolutePath) {
        return (pathToRoot.indexOf(absolutePath) < 0);
      })
      .filter(notPackage)
      .forEach(function enqueue(absolutePath) {
        queue.push(absolutePath);
      });
  }

  // ignore data uris and ensure we are at a valid start path
  var absoluteStart = !(/^data\:/.test(uri)) && path.resolve(startPath);
  if (absoluteStart) {

    // find path to the root, stopping at cwd, package.json or bower.json
    var pathToRoot = [];
    var isWorking;
    do {
      pathToRoot.push(absoluteStart);
      isWorking = (absoluteStart !== process.cwd()) && notPackage(absoluteStart);
      absoluteStart = path.resolve(absoluteStart, '..');
    } while (isWorking);

    // start a queue with the path to the root
    var queue = pathToRoot.concat();

    // process the queue until empty
    //  the queue pattern ensures that we favour paths closest the the start path
    while (queue.length) {

      // shift the first item off the queue, consider it the base for our relative uri
      var basePath = queue.shift();
      var fullPath = path.resolve(basePath, uri);

      // file exists so convert to a dataURI and end
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
      // enqueue subdirectories that are not packages and are not in the root path
      else {
        enqueue(queue, basePath);
      }
    }

    // not found
    return null;
  }
}

/**
 * Search for the relative file reference from the <code>startPath</code> up to the process
 * working directory, avoiding any other directories with a <code>package.json</code> or <code>bower.json</code>,
 * and encode as base64 data URI.
 * @param {string} startPath The location of the uri declaration and the place to start the search from
 * @param {string} uri The content of the url() statement, expected to be a relative file path
 * @returns {string} data URI of the file where found or <code>null</code> otherwise
 */
function embedRelativeURL(startPath, uri) {
  var fullPath = findFile(startPath, uri);
  if (fullPath) {
    var type     = mime.lookup(fullPath),
        contents = fs.readFileSync(fullPath),
        base64   = new Buffer(contents).toString('base64');
    return 'data:' + type + ';base64,' + base64;
  } else {
    return null;
  }
}

/**
 * Use <code>node-sass</code> to compile the files of the input stream.
 * Outputs a stream of compiled files and their source-maps, alternately.
 * @see https://github.com/sass/node-sass#outputstyle
 * @param {Array.<string>} [libraryPaths] Any number of library path strings
 * @returns {stream.Through} A through stream that performs the operation of a gulp stream
 */
module.exports = function (options) {
  defaults(options, {
    libraryPaths: [],
    embedAssets : false
  });

  var output  = [],
      libList = options.libraryPaths.filter(function isString(value) {
        return (typeof value === 'string');
      });

  return through.obj(function (file, encoding, done) {
    var stream = this;

    // setup parameters
    var sourcePath   = path.dirname(file.path),
        compiledName = path.basename(file.path, path.extname(file.path)) + '.css',
        mapName      = compiledName + '.map',
        sourceMapConsumer;

    /**
     * Push file contents to the output stream.
     * @param {string} filename The filename of the file, including extension
     * @param {Buffer|string|object} [contents] Optional contents for the file or fields to assign to it
     * @return {vinyl.File} The file that has been pushed to the stream
     */
    function pushResult(filename, contents) {
      var pending = new gutil.File({
        cwd     : file.cwd,
        base    : file.base,
        path    : path.join(sourcePath, filename),
        contents: Buffer.isBuffer(contents) ? contents : (typeof contents === 'string') ? new Buffer(contents) : null
      });
      stream.push(pending);
      return pending;
    }

    /**
     * Create a plugin for css rework that performs rewriting of url() sources
     * @param {function({string}, {string}):{string}} uriRewriter A method that rewrites uris
     */
    function rewriteUriPlugin(uriRewriter) {
      return function reworkPlugin(stylesheet) {

        // visit each node (selector) in the stylesheet recursively using the official utility method
        //  each node may have multiple declarations
        visit(stylesheet, function visitor(declarations) {
          declarations
            .forEach(eachDeclaration);
        });

        /**
         * Process a declaration from the syntax tree.
         * @param declaration
         */
        function eachDeclaration(declaration) {
          var URL_STATEMENT_REGEX = /(url\s*\()\s*(?:(['"])((?:(?!\2).)*)(\2)|([^'"](?:(?!\)).)*[^'"]))\s*(\))/g;

          // reverse the original source-map to find the original sass file
          var cssStart = declaration.position.start;
          var sassStart = sourceMapConsumer.originalPositionFor({
            line  : cssStart.line,
            column: cssStart.column
          });
          if (!sassStart.source) {
            throw new Error('failed to decode node-sass source map'); // this can occur with regressions in libsass
          }
          var sassDir = path.dirname(sassStart.source);

          // allow multiple url() values in the declaration
          //  split by url statements and process the content
          //  additional capture groups are needed to match quotations correctly
          //  escaped quotations are not considered
          declaration.value = declaration.value
            .split(URL_STATEMENT_REGEX)
            .map(eachSplitOrGroup)
            .join('');

          /**
           * Encode the content portion of <code>url()</code> statements.
           * There are 4 capture groups in the split making every 5th unmatched.
           * @param {string} token A single split item
           * @param i The index of the item in the split
           * @returns {string} Every 3 or 5 items is an encoded url everything else is as is
           */
          function eachSplitOrGroup(token, i) {

            // we can get groups as undefined under certain match circumstances
            var initialised = token || '';

            // the content of the url() statement is either in group 3 or group 5
            var mod = i % 7;
            if ((mod === 3) || (mod === 5)) {

              // remove query string or hash suffix
              var uri = initialised.split(/[?#]/g).shift();
              return uri && uriRewriter(sassDir, uri) || initialised;
            }
            // everything else, including parentheses and quotation (where present) and media statements
            else {
              return initialised;
            }
          }
        }
      };
    }

    /**
     * A URI re-writer function that pushes the file to the output stream and rewrites the URI accordingly.
     * @param {string} startPath The location of the uri declaration and the place to start the search from
     * @param {string} uri The content of the url() statement, expected to be a relative file path
     * @returns {string} the new URL of the output file where found or <code>null</code> otherwise
     */
    function pushAssetToOutput(startPath, uri) {
      var fullPath = findFile(startPath, uri);
      if (fullPath) {
        var contents = fs.readFileSync(fullPath),
            hash     = crypto.createHash('md5').update(contents).digest('hex'),
            filename = ['.', compiledName + '.assets', hash + path.extname(fullPath)].join('/');
        pushResult(filename, contents);
        return filename;
      } else {
        return null;
      }
    }

    /**
     * Handler for successful transpilation using node-sass.
     * This functions gets called with an object containing a CSS file and its source-map,
     * which is modified and passed through CSS rework, before being pushed to the results.
     * @param {string} css Compiled css
     * @param {string} map The source-map for the compiled css
     */
    function successHandler(css, map) {

      // adjust source-map
      var sourceMap = convert.fromJSON(map).toObject();
      sourceMap.sources.forEach(function (value, i, array) {
        array[i] = path.resolve(value.replace(/^\//, '').replace(/\b\/+\b/g, '/'));  // ensure single slash absolute
      });

      // prepare the adjusted sass source-map for later look-ups
      sourceMapConsumer = new SourceMapConsumer(sourceMap);

      // embed sourcemap in css
      var cssWithMap = css.replace(
        /\/\*#\s*sourceMappingURL=[^*]*\*\//m,
        '/*# sourceMappingURL=data:application/json;base64,' + convert.fromObject(sourceMap).toBase64() + ' */'
      );

      // rework css
      var plugin   = rewriteUriPlugin(options.embedAssets ? embedRelativeURL : pushAssetToOutput),
          reworked = rework(cssWithMap, '')
            .use(plugin)
            .toString({
              sourcemap        : true,
              sourcemapAsObject: true
            });

      // adjust overall sourcemap
      delete reworked.map.file;
      delete reworked.map.sourcesContent;
      reworked.map.sources.forEach(function (value, i, array) {
        array[i] = '/' + slash(path.relative(process.cwd(), value));   // ensure root relative
      });

      // write stream output
      pushResult(compiledName, reworked.code + '\n/*# sourceMappingURL=' + mapName + ' */');
      pushResult(mapName, JSON.stringify(reworked.map, null, 2));
      done();
    }

    /**
     * Handler for error in node-sass.
     * @param {string} error The error text from node-sass
     */
    function errorHandler(error) {
      var analysis = /(.*)\:(\d+)\:\s*error\:\s*(.*)/.exec(error),
          resolved = path.resolve(analysis[1]),
          filename = ['.scss', '.css']
            .map(function (ext) {
              return resolved + ext;
            })
            .filter(function (fullname) {
              return fs.existsSync(fullname);
            })
            .pop(),
          message  = analysis ?
            ((filename || resolved) + ':' + analysis[2] + ':0: ' + analysis[3] + '\n') :
            ('TODO parse this error\n' + error + '\n');
      if (output.indexOf(message) < 0) {
        output.push(message);
      }
      done();
    }

    /**
     * Perform the sass render with the given <code>sourceMap</code>, <code>error</code>, and <code>success</code>
     * parameters.
     * @param {string|boolean} map The source map filename or <code>false</code> for none
     * @param {function ({string})} error Handler for error
     * @param {function ({string}, {string})} success Handler for success
     */
    function render(map, error, success) {
      sass.render({
        file        : file.path,
        data        : file.contents.toString(),
        success     : success,
        error       : error,
        includePaths: libList,
        outputStyle : 'compressed',
        stats       : {},
        sourceMap   : map
      });
    }

    // run first without source-map as this can cause process exit where errors exist
    render(false, errorHandler, function () {
      render(mapName, errorHandler, successHandler);
    });

  }, function (done) {

    // display the output buffer with padding before and after and between each item
    if (output.length) {
      var WIDTH = 80,
          hr    = new Array(WIDTH + 1),       // this is a good trick to repeat a character N times
          start = (WIDTH > 0) ? (hr.join('\u25BC') + '\n') : '',
          stop  = (WIDTH > 0) ? (hr.join('\u25B2') + '\n') : '';
      process.stdout.write(start + '\n' + output.join('\n') + '\n' + stop);
    }
    done();
  });
};
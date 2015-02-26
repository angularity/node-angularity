var path              = require('path');
var fs                = require('fs');
var through           = require('through2');
var sass              = require('node-sass');
var gutil             = require('gulp-util');
var slash             = require('gulp-slash');
var rework            = require('rework');
var visit             = require('rework-visit');
var convert           = require('convert-source-map');
var SourceMapConsumer = require('source-map').SourceMapConsumer;
var mime              = require('mime');

/**
 * Search for the relative file reference from the <code>startPath</code> up to the process
 * working directory.
 * @param {string} startPath The location of the uri declaration and the place to start the search from
 * @param {string} uri The content of the url() statement, expected to be a relative file path
 * @param {string} [callerPath] The full path of the invoking function instance where recursion has occurred
 * @returns {string} dataURI of the file where found or <code>undefined</code> otherwise
 */
function encodeRelativeURL(startPath, uri, callerPath) {
  'use strict';

  // ignore data uris, ensure we are at a valid start path that is not process working directory
  var absStart = !(/^data\:/.test(uri)) && path.resolve(startPath);
  if (absStart) {
    var fullPath = path.resolve(startPath, uri);

    // file exists so get the dataURI
    if (fs.existsSync(fullPath)) {
      var type     = mime.lookup(fullPath);
      var contents = fs.readFileSync(fullPath);
      var base64   = new Buffer(contents).toString('base64');
      return 'url(data:' + type + ';base64,' + base64 + ')';
    }
    // don't consider any other directories in the current working directory
    else if (startPath !== process.cwd()) {

      // search child directories then parent
      var directories = fs.readdirSync(absStart)
        .map(function toAbsolute(filename) {
          return path.join(absStart, filename);
        }).filter(function directoriesOnly(absolute) {
          return fs.statSync(absolute).isDirectory();
        })
        .concat(path.resolve(absStart, '..'))  // parent directory
        .filter(function excludeCallerDir(absoluteDir) {
          return (absoluteDir !== callerPath);
        });

      // use the first success, may be undefined
      for (var i = 0, result = null; !result && (i < directories.length); i++) {
        result = encodeRelativeURL(directories[i], uri, absStart);
      }
      return result;
    }
  }
}

/**
 * Use <code>node-sass</code> to compile the files of the input stream.
 * Outputs a stream of compiled files and their source-maps, alternately.
 * @see https://github.com/sass/node-sass#outputstyle
 * @param {Array.<string>} [libraryPaths] Any number of library path strings
 * @returns {stream.Through} A through stream that performs the operation of a gulp stream
 */
module.exports = function (bannerWidth, libraryPaths) {
  'use strict';
  var output  = [ ];
  var libList = (libraryPaths || [ ]).filter(function isString(value) {
    return (typeof value === 'string');
  });
  return through.obj(function (file, encoding, done) {
    var stream = this;

    // setup parameters
    var sourcePath = file.path.replace(path.basename(file.path), '');
    var sourceName = path.basename(file.path, path.extname(file.path));
    var mapName    = sourceName + '.css.map';
    var sourceMapConsumer;

    /**
     * Push file contents to the output stream.
     * @param {string} ext The extention for the file, including dot
     * @param {string|object?} contents The contents for the file or fields to assign to it
     * @return {vinyl.File} The file that has been pushed to the stream
     */
    function pushResult(ext, contents) {
      var pending = new gutil.File({
        cwd:      file.cwd,
        base:     file.base,
        path:     sourcePath + sourceName + ext,
        contents: (typeof contents === 'string') ? new Buffer(contents) : null
      });
      if (typeof contents === 'object') {
        for (var key in contents) {
          pending[key] = contents[key];
        }
      }
      stream.push(pending);
      return pending;
    }

    /**
     * Plugin for css rework that follows SASS transpilation
     * @param {object} stylesheet AST for the CSS output from SASS
     */
    function reworkPlugin(stylesheet) {

      // visit each node (selector) in the stylesheet recursively using the official utility method
      visit(stylesheet, function (declarations, node) {

        // each node may have multiple declarations
        declarations.forEach(function (declaration) {

          // reverse the original source-map to find the original sass file
          var cssStart  = declaration.position.start;
          var sassStart = sourceMapConsumer.originalPositionFor({
            line:   cssStart.line,
            column: cssStart.column
          });
          if (!sassStart.source) {
            throw new Error('failed to decode node-sass source map'); // this can occur with regressions in libsass
          }
          var sassDir = path.dirname(sassStart.source);

          // allow multiple url() values in the declaration
          //  the uri will be every second value (i % 2)
          declaration.value = declaration.value
            .split(/url\s*\(\s*['"]?([^'"?#]*)[^)]*\)/g)  // split by url statements
            .map(function (token, i) {
              return (i % 2) ? (encodeRelativeURL(sassDir, token) || ('url(' + token + ')')) : token;
            }).join('');
        });
      });
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
      var reworked = rework(cssWithMap, '')
        .use(reworkPlugin)
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
      pushResult('.css', reworked.code + '\n/*# sourceMappingURL=' + mapName  + ' */');
      pushResult('.css.map', JSON.stringify(reworked.map, null, 2));
      done();
    }

    /**
     * Handler for error in node-sass.
     * @param {string} error The error text from node-sass
     */
    function errorHandler(error) {
      var analysis = /(.*)\:(\d+)\:\s*error\:\s*(.*)/.exec(error);
      var resolved = path.resolve(analysis[1]);
      var filename = [ '.scss', '.css']
        .map(function (ext) {
          return resolved + ext;
        })
        .filter(function (fullname) {
          return fs.existsSync(fullname);
        })
        .pop();
      var message  = analysis ?
        ((filename || resolved) + ':' + analysis[2] + ':0: ' + analysis[3] + '\n') :
        ('TODO parse this error\n' + error + '\n');
      if (output.indexOf(message) < 0) {
        output.push(message);
      }
      done();
    }

    // perform the sass render
    sass.render({
      file        : file.path,
      data        : file.contents.toString(),
      success     : successHandler,
      error       : errorHandler,
      includePaths: libList,
      outputStyle : 'compressed',
      stats       : { },
      sourceMap   : mapName
    });

  }, function (done) {

    // display the output buffer with padding before and after and between each item
    if (output.length) {
      var width = Number(bannerWidth) || 0;
      var hr    = new Array(width + 1);   // this is a good trick to repeat a character N times
      var start = (width > 0) ? (hr.join('\u25BC') + '\n') : '';
      var stop  = (width > 0) ? (hr.join('\u25B2') + '\n') : '';
      process.stdout.write(start + '\n' + output.join('\n') + '\n' + stop);
    }
    done();
  });
};
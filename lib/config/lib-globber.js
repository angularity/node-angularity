'use strict';

var fs        = require('fs'),
    path      = require('path'),
    flatten   = require('lodash.flatten'),
    minimatch = require('minimatch');

/**
 * Define a glob generator that includes files from the local library, where the local library is all subdirectories
 * except those given in the <code>exclusions</code>.
 * @param {...string|Array} [excludes] Any number of non-library directory names to exclude (glob syntax)
 * @returns {function({...string|Array}):function} A function that creates a globber with additions
 */
function libGlobber() {
  var excludes = flatten(Array.prototype.slice.call(arguments));

  /**
   * Create a glob generator that includes items from the exclusion list.
   * @param {...string|Array} [additional] Any number of excluded directory names to include (glob syntax)
   * @returns {function({...string|Array}):{Array.<string>}} A function that creates a multi-element glob pattern
   */
  return function globberWithAdditions() {
    var additional = flatten(Array.prototype.slice.call(arguments)),
        subdirs    = fs.readdirSync(process.cwd())
          .filter(testIsDirectory)
          .filter(removeExcludesKeepAdditional);

    /**
     * Create a glob where the given elements are appended to all directores in the library.
     * Negative elements appear as-is and are not appended to library directores.
     * @param {...string|Array} Any number of glob elements
     * @returns {Array.<string>} A multi-element glob pattern
     */
    return function doGlob() {
      var args = flatten(Array.prototype.slice.call(arguments)),
          list = args.reduce(prependSubdirs, []);
      return list;
    };

    function prependSubdirs(reduced, pattern) {
      if (pattern.charAt(0) === '!') {
        return reduced.concat(pattern);
      } else {
        return reduced.concat(subdirs.map(function eachSubdir(subdir) {
          return subdir + '/' + pattern;
        }));
      }
    }

    function testIsDirectory(filename) {
      return (filename.charAt(0) !== '.') && fs.statSync(path.resolve(filename)).isDirectory();
    }

    function removeExcludesKeepAdditional(element) {
      return !excludes.some(matchGlobWith(element)) || additional.some(matchGlobWith(element));
    }

    function matchGlobWith(element) {
      return function matchGlob(glob) {
        return minimatch(element, glob);
      };
    }
  };
}

module.exports = libGlobber;
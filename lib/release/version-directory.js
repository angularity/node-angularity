var fs      = require('fs');
var path    = require('path');
var crypto  = require('crypto');
var through = require('through2');
var gutil   = require('gulp-util');

/**
 * Rename the base directory of the given file stream with a hash of its content.
 * @param {boolean} hashKeyword A substring in the directory path that will be replaced with the hash
 * @param {boolean} isVerbose Determines whether versioned paths are logged to the output
 * @returns {stream.Through} A through stream that performs the operation of a gulp stream
 */
module.exports = function (hashKeyword, isVerbose) {
  'use strict';
  var baseDirectory;
  var hash         = crypto.createHash('md5');
  var pathList     = [ ];
  var relativeList = [ ];
  return through.obj(function(file, encoding, done) {
    var fileBase = path.resolve(file.base);
    var error;
    baseDirectory = baseDirectory || fileBase;
    if (fileBase !== baseDirectory) {
      error = new Error('base path must be the same in all files');
    } else if (file.isBuffer()) {
      hash.update(file.relative);
      hash.update(file.contents);
      pathList.push(file.path);
      relativeList.push(file.relative);
    }
    done(error);
  }, function(done) {
    var stream  = this;
    var newBase = baseDirectory.replace(hashKeyword, hash.digest('hex'));
    fs.rename(baseDirectory, newBase, function() {
      pathList.forEach(function (filename) {
        stream.push(filename.replace(baseDirectory, newBase));
      });
      while (isVerbose && relativeList.length) {
        gutil.log('version-directory', relativeList.shift());
      }
      done();
    });
  });
};
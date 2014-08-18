var fs      = require('fs');
var path    = require('path');
var crypto  = require('crypto');
var through = require('through2');

module.exports = function () {
  var baseDirectory;
  var hash = crypto.createHash('md5');
  return through.obj(function(file, encoding, done) {
    var fileBase = path.resolve(file.base);
    var error;
    baseDirectory = baseDirectory || fileBase;
    if (fileBase !== baseDirectory) {
      error = new Error('base path must be the same in all files');
    } else if (file.isBuffer()) {
      hash.update(file.relative);
      hash.update(file.contents);
    } else {
      hash.update(file.relative);
    }
    done(error, file);
  }, function(done) {
    fs.rename(baseDirectory, baseDirectory + '-' + hash.digest('hex'), done);
  });
}
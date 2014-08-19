var fs      = require('fs');
var path    = require('path');
var crypto  = require('crypto');
var through = require('through2');

module.exports = function () {
  var baseDirectory;
  var hash      = crypto.createHash('md5');
  var filenames = [ ];
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
    filenames.push(file.path);
    done(error);
  }, function(done) {
    var stream  = this;
    var newBase = baseDirectory + '-' + hash.digest('hex');
    fs.rename(baseDirectory, newBase, function() {
      filenames.forEach(function (filename) {
        stream.push(filename.replace(baseDirectory, newBase));
      });
      done();
    });
  });
}
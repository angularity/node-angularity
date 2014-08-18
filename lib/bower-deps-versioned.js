var gulp     = require('gulp');
var semiflat = require('gulp-semiflat');
var path     = require('path');
var through  = require('through2');

module.exports = function (BOWER) {
  'use strict';
  var bowerPackages = require(path.resolve('bower.json')).dependencies;
  var files         = [ ];
  var map           = { };
  for(var key in bowerPackages) {
    var bowerPath   = BOWER + '/' + key + '/';
    var packageJSON = require(path.resolve(bowerPath + 'bower.json'));
    [ ].concat(packageJSON.main).forEach(function(value) {
      var relative = path.normalize(bowerPath + value);
      var absolute = path.resolve(relative);
      files.push(relative);
      map[absolute] = '/' + path.join(key, packageJSON.version, value);
    });
  }
  return {
    src: function(opts) {
      return gulp.src(files, opts)
        .pipe(semiflat(process.cwd()));
    },
    version: function() {
      return through.obj(function(file, encoding, done) {
        file.base = process.cwd();
        file.path = file.base + map[file.path];
        done(null, file);
      });
    }
  };
}
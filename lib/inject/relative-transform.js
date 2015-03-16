'use strict';

var path  = require('path'),
    slash = require('gulp-slash');

/**
 * An inject transform that constructs html using relative file locations.
 */
module.exports = function relativeTransform(filepath, file, index, length, targetFile) {
  var relative = slash(path.relative(path.dirname(targetFile.path), file.path));
  switch(path.extname(relative)) {
    case '.css':
      return '<link rel="stylesheet" href="' + relative + '">';
    case '.js':
      return '<script src="' + relative + '"></script>';
  }
};
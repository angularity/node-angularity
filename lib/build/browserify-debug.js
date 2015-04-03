'use strict';

var through = require('through2'),
    fs      = require('fs');

/**
 * Transform that writes out the current state of the file next to the original.
 * Primarily for source map visualisation.
 * @see http://sokra.github.io/source-map-visualization
 * @param {string} [extension] An extention to append to the file
 * @returns {Function} Browserify transform
 */
function debugTransform(extension) {
  return function(file) {
    var chunks = [];

    function transform(chunk, encoding, done) {
      /* jshint validthis:true */
      chunks.push(chunk);
      this.push(chunk);
      done();
    }

    function flush(done) {
      var filename = [file, extension || 'gen'].join('.');
      var data     = chunks.join('');
      fs.writeFile(filename, data, done);
    }

    return through(transform, flush);
  };
}

module.exports = debugTransform;

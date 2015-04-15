/**
 * Tools for debugging Browserify transforms.
 * @see https://github.com/bholloway/browserify-debug-tools
 * @author bholloway
 */
'use strict';

var through = require('through2'),
    fs      = require('fs');

/**
 * Transform that writes out the current state of the transformed file next to the original source file.
 * Primarily for source map visualisation.
 * @see http://sokra.github.io/source-map-visualization
 * @param {string} [extension] An extention to append to the file
 * @returns {Function} Browserify transform
 */
function dumpToFile(extension) {
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

module.exports = {
  dumpToFile: dumpToFile
};

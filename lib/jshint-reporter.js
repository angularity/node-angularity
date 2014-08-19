var through = require('through2');

/**
 * A terse reporter for JSHint that uses the format as <code>traceurReporter</code>.
 * Outputs elements from the input stream without transformation.
 * @param {number?} bannerWidth The width of banner comment, zero or omitted for none
 * @returns {stream.Through} A through stream that performs the operation of a gulp stream
 */
module.exports = function (bannerWidth) {
  var output = [ ];
  var item   = '';
  var prevfile;

  // push each item to an output buffer
  return through.obj(function (file, encoding, done) {
    if (file.jshint && !file.jshint.success && !file.jshint.ignored) {
      (function reporter(results) {
        results.forEach(function (result) {
          var filename = result.file;
          var error    = result.error;
          if ((prevfile) && (prevfile !== filename) && (item) && (output.indexOf(item) < 0)) {
            output.push(item);
            item = '';
          }
          item    += filename + ':' + error.line + ':' +  error.character + ': ' + error.reason + '\n';
          prevfile = filename;
        });
      })(file.jshint.results, file.jshint.data);
    }

    // all elements to the output
    this.push(file);
    done();

  // display the output buffer with padding before and after and between each item
  }, function (done) {
    if ((item) && (output.indexOf(item) < 0)) {
      output.push(item);
    }
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

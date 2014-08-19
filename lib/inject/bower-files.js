var bowerFiles = require('bower-files');
var stream     = require('stream');
var gulp       = require('gulp');

/**
 * @param {number?} bannerWidth The width of banner comment, zero or omitted for none
 */
module.exports = function (bannerWidth) {
  function error() {
    var width = Number(bannerWidth) || 0;
    var hr = new Array(width + 1);   // this is a good trick to repeat a character N times
    var start = (width > 0) ? (hr.join('\u25BC') + '\n') : '';
    var stop = (width > 0) ? (hr.join('\u25B2') + '\n') : '';
    process.stdout.write(start + '\nERROR: Mismatch between your bower.json and the installed packages.\n\n' + stop);
  }
  function getField(field, opts) {
    var parsed = bowerFiles(opts);
    return {

      /**
       * Retrieve the given field from <code>bower-files</code> package as a file stream.
       * @param {string} field The field to retrieve <code>js</code> or <code>css</code
       * @param {object} opts Options for the <code>bower-files</code> package
       * @return {stream.Readable} A readable stream of vinyl files, possibly empty
       */
      stream: function(opts) {
        var value = parsed[field];
        if (value) {
          return gulp.src(value, opts);
        } else {
          error();
          var readable = new stream.Readable({ objectMode: true });
          readable._read = function () { };
          readable.push(null);
          return readable;
        }
      },

      /**
       * Retrieve the given field from <code>bower-files</code> package as a file list.
       * @param {string} field The field to retrieve <code>js</code> or <code>css</code
       * @return {Array.<Stream>} A list of file names, possibly empty
       */
      list: function() {
        var value = parsed[field];
        if (value) {
          return value;
        } else {
          error();
          return [ ];
        }
      }
    }
  };

  // complete
  return {
    js:  getField('js', opts),
    css: getField('js', opts)
  };
}
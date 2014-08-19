var path         = require('path');
var through      = require('through2');
var throughPipes = require('through-pipes');
var gulp         = require('gulp');
var inject       = require('gulp-inject');
var slash        = require('gulp-slash');
var semiflat     = require('gulp-semiflat');

/**
 * Inject all files found in the same relative directory as the HTML file of the stream.
 * Also inject all files found in the directories above, up to and including the base path.
 * Where a <code>basePath</code> is not given JS is presumed to be adjacent to HTML.
 * Outputs a stream of HTML files with amended content.
 * @param {string} extension One or more file types to consider, pipe delimited, or '*' for all
 * @param {string} basePath An absolute or root relative base path for files
 * @param {object} opts Options for <code>inject</code>
 * @returns {stream.Through} A through stream that performs the operation of a gulp stream
 */
module.exports = function (extension, basePath, opts) {
  'use strict';
  var extensions = extension ? extension.split('|') : [ '*' ];
  return through.obj(function (file, encoding, done) {
    var stream = this;

    // infer the html base path from the file.base and use this as a base to locate
    //  the corresponding javascript file
    function srcStream() {
      var htmlName  = path.basename(file.path);
      var htmlPath  = path.resolve(file.path.replace(htmlName, ''));
      var htmlBase  = path.resolve(file.base);
      var jsBase    = (basePath) ? path.resolve(basePath)  : htmlBase;
      var relative  = htmlPath.replace(htmlBase, '').split(/[\\\/]/g);
      var glob      = [ ];
      relative.forEach(function(unused, i, array) {
        extensions.forEach(function(extension) {
          glob.push([ basePath ].concat(array.slice(0, i + 1)).concat('*.' + extension).join('/'));
        });
      });
      return gulp.src(glob, { read: false })
        .pipe(semiflat(jsBase))
        .pipe(slash());
    }

    // process the single file using a stream
    throughPipes(function (readable) {
      return readable
        .pipe(inject(srcStream(), opts));
    })
      .input(file)
      .output(function (file) {
        stream.push(file);
        done();
      });
  });
}
var path         = require('path');
var through      = require('through2');
var querystring  = require('querystring');
var childProcess = require('child_process');

/**
 * Wrap the given value in quotation marks
 * @param {*} value The value to wrap
 * @returns {string} The string representation of the value in quotation marks
 */
function quote(value) {
  'use strict';
  return '"' + value + '"';
}

/**
 * Run karma once only with the given <code>options</code> and the files from the stream appended.
 * Removes any logging from the output.
 * No output. Ends when the Karma process ends.
 * @param {object} options Karma options
 * @param {number} [bannerWidth] The width of banner comment, zero or omitted for none
 * @returns {stream.Through} A through strconcateam that performs the operation of a gulp stream
 */
module.exports = function (options, bannerWidth) {
  'use strict';

  // setup
  options.singleRun  = true;
  options.autoWatch  = false;
  options.configFile = options.configFile ? path.resolve(options.configFile) : undefined;
  options.files      = options.files || [ ];

  // add unique all stream JS files to the options.files list
  return through.obj(function(file, encoding, done) {
    var isValid = !(file.isNull()) && (path.extname(file.path) === '.js');
    if (isValid && options.files.indexOf(file.path < 0)) {
      options.files.push(file.path);
    }
    done();

  // run once at the end of the stream
  }, function(done) {
    if (options.files.length) {
      var appPath = path.join(__dirname, 'karma-background.js');
      var data    = querystring.escape(JSON.stringify(options));
      var command = [ 'node', quote(appPath), data ].join(' ');
      childProcess.exec(command, { cwd: process.cwd() }, function (stderr, stdout) {
        var report;
        if (stdout) {
          report = stdout
            .replace(/^\s+/gm, '')                                  // remove leading whitespace
            .replace(/^(LOG.*\n$)/gm, options.silent ? '' : '$1')   // remove logging
            .replace(/at\s+null\..*/gm, '')                         // remove file reference
            .replace(/\n\n/gm, '\n')                                // consolidate consecutive line breaks
            .replace(/^\n|\n$/g, '');                               // remove leading and trailing line breaks overall
        } else if (stderr) {
          var analysis = /$Error\:\s*(.*)$/mg.exec(stderr);
          report = analysis ? analysis[1] : stderr;
        }
        if (report) {
          var width = Number(bannerWidth) || 0;
          var hr    = new Array(width + 1);   // this is a good trick to repeat a character N times
          var start = (width > 0) ? (hr.join('\u25BC') + '\n') : '';
          var stop  = (width > 0) ? (hr.join('\u25B2') + '\n') : '';
          process.stdout.write(start + '\n' + report + '\n\n' + stop);
        }
        done();
      });
    } else {
      done();
    }
  });
};

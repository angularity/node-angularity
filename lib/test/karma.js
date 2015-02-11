'use strict';

var path            = require('path');

var gulp            = require('gulp'),
    gulpIf          = require('gulp-if'),
    through         = require('through2'),
    querystring     = require('querystring'),
    childProcess    = require('child_process');

/**
 * Wrap the given value in quotation marks
 * @param {*} value The value to wrap
 * @returns {string} The string representation of the value in quotation marks
 */
function quote(value) {
  return '"' + value + '"';
}

var filesAppendRegex = /\/\*+\s*ANGULARITY_FILE_LIST\s*\*+\// ;

/**
 * Create a through2 object stream.
 * Expects all the `*.js` files to be included as the files list in the karma conf
 * Creates a new karma config file, based on the karma config file name found in
 * the local project root, and augments its file list by replacing
 * `ANGULARITY_FILE_LIST` in ablock comment with the actual array of files.
 * The new karma config file is added to the stream,
 * All input `*.js` files are filtered out of the stream
 *
 * @param {string} configFileName The project local karma config file to augment
 *   Defaults to "karma.conf.js"
 * @return {stream.Through} The output of this stream is expected to contain
 *   just one file: the augmented karma config file.
 */
function karmaConfig(configFileName) {
  configFileName = 'karma.conf.js';
  var files = [];

  function transformFn(file, encoding, done) {
    if (!file || !file.path) {
      throw 'Files must have paths';
    }
    var stream = this;
    //filter out all files (nothing added back to the stream)
    //but we save file paths for later use in the flush function
    if (path.extname(file.path) !== '.map') {
      files.push(file.path);
    }
    done();
  }

  function flushFn(done) {
    var stream = this;
    var filesAppend = JSON.stringify(files, null, '  ');

    //aggregate and append to karma.conf.js in the project root folder
    gulp
      .src(path.resolve(configFileName))
      .on('data', function(karmaConfigFile) {
        var contents = karmaConfigFile.contents.toString();
        contents = contents.replace(filesAppendRegex, filesAppend);
        karmaConfigFile.contents = new Buffer(contents);
        stream.push(karmaConfigFile);
      })
      .on('end', function() {
        done();
      });
  }

  return through.obj(transformFn, flushFn);
}

/**
 * Run karma once only with the karma config file present in the input stream.
 * No output. Ends when the Karma process ends.
 * Runs karma in a child process, to avoid `process.exit()` called by karma.
 *
 * @param {number} [bannerWidth] The width of banner comment, zero or omitted for none
 * @returns {stream.Through} A through strconcateam that performs the operation of a gulp stream
 */
function karmaRun(bannerWidth) {
  var options = {
    configFile: undefined
  };

  return through.obj(function transformFn(file, encoding, done) {
    options.configFile = file.path;
    done();
  },
  function streamFn(done) {
    var appPath = path.join(__dirname, 'karma-background.js');
    var data    = querystring.escape(JSON.stringify(options));
    var command = [ 'node', quote(appPath), data ].join(' ');

    //TODO @bguiz replace reporter function with a standard karma reporter,
    //and extract it to own module
    //perhaps extend the spec reporter to do what is being done here, instead of post processing its output here
    //check if there is a webstorm/ teamcity reporter
    childProcess.exec(command, { cwd: process.cwd() }, function reporter(stderr, stdout) {
      var report;
      if (stdout) {
        console.log(stdout);
        report = stdout
          .replace(/^\s+/gm, '')                                  // remove leading whitespace
          .replace(/^(LOG.*\n$)/gm, options.silent ? '' : '$1')   // remove logging
          .replace(/at\s+null\..*/gm, '')                         // remove file reference
          .replace(/\n\n/gm, '\n')                                // consolidate consecutive line breaks
          .replace(/^\n|\n$/g, '');                               // remove leading and trailing line breaks overall
      } else if (stderr) {
        console.log(stderr);

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
  });
};

module.exports = {
  createConfig: karmaConfig,
  run: karmaRun
};

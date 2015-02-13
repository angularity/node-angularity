'use strict';

var path            = require('path');

var gulp            = require('gulp'),
    through         = require('through2'),
    querystring     = require('querystring'),
    childProcess    = require('child_process');

var yargs           = require('../util/yargs');

/**
 * Wrap the given value in quotation marks
 * @param {*} value The value to wrap
 * @returns {string} The string representation of the value in quotation marks
 */
function quote(value) {
  return '"' + value + '"';
}

var defaultReporterName = 'angularity-karma-reporter';

var filesAppendRegex = /\/\*+\s*ANGULARITY_FILE_LIST\s*\*+\// ;
var reportersAppendRegex = /\/\*+\s*ANGULARITY_REPORTER_LIST\s*\*+\// ;
var pluginsAppendRegex = /\/\*+\s*ANGULARITY_PLUGIN_LIST\s*\*+\// ;
var karmaReporterMatchNameRegex = /^karma-(.+)-reporter$/ ;

/**
 * Determine the `require` path for a plugin.
 *
 * @param {string} reporterName Either a package name,
 *   *OR* an absolute path, for a karma reporter.
 * @return {string} In karma config file, `plugins` will be inline `require`d
 *   using this return value.
 */
function getKarmaReporterPluginPath(reporterName) {
  if (typeof reporterName !== 'string') {
    throw 'Get Karma Reporter Plugin Path: Reporter name is unspecified';
  }

  if (reporterName === defaultReporterName) {
    return defaultReporterName;
  }
  else {
    var reporterPath = (path.dirname(reporterName) === '.') ?
      path.resolve('node_modules', 'karma-' + reporterName + '-reporter') :
      reporterName;
    try {
      require(reporterPath);
    }
    catch (ex) {
      throw 'Get Karma Reporter Plugin Path: Attempt to require reporter from path ' +
        reporterPath + ' with no success.';
    }
    reporterPath = path.normalize(reporterPath);
    //quirk: nodejs identifies all windows (both win32 and win64) as win32
    if (process.platform === 'win32') {
      //replace any single backslash characters in file paths with
      //double backslash on windows; neither path.normalize nor path.resolve do this
      reporterPath = reporterPath.replace( /\\/g , '\\\\' );
    }
    return reporterPath;
  }
}

/**
 * Determine the registered reporter name.
 *
 * @param {string} reporterName Either the registered reporter name,
 *   *OR* an absolute path, for a karma reporter.
 * @return {string} The registered reporter name for use in
 *   the `reporters` section of the karma config file.
 */
function getKarmaReporterName(reporterName) {
  if (typeof reporterName !== 'string') {
    throw 'Get Karma Reporter Name: Reporter name is unspecified';
  }

  var name = (path.dirname(reporterName) === '.') ?
    reporterName :
    path.basename(reporterName);
  var match = karmaReporterMatchNameRegex.exec(name);
  if (!!match && match.length === 2) {
    name = match[1];
  }
  return name
}

/**
 * Create a through2 object stream.
 * Expects all the `*.js` files to be included as the files list in the karma conf
 * Creates a new karma config file, based on the karma config file name found in
 * the local project root, and augments its file list by replacing
 * `ANGULARITY_FILE_LIST` in ablock comment with the actual array of files.
 * The new karma config file is added to the stream,
 * All input `*.js` files are filtered out of the stream
 *
 * @param {Array.<string>} [reporters] The name of the karma reporter to use
 * @param {string} [configFileName] The project local karma config file to augment
 *   Defaults to "karma.conf.js"
 * @return {stream.Through} The output of this stream is expected to contain
 *   just one file: the augmented karma config file.
 */
function karmaCreateConfig(reporters, configFileName) {
  reporters = reporters || [];
  configFileName = configFileName || 'karma.conf.js';
  var files = [];

  function transformFn(file, encoding, done) {
    if (!file || !file.path) {
      throw 'Files must have paths';
    }
    files.push(file.path);
    done();
  }

  function flushFn(done) {
    var stream = this;
    var filesAppend = JSON.stringify(files, null, '  ');
    var reportersAppend = JSON.stringify(reporters.map(getKarmaReporterName), null, '  ');
    var pluginsAppend = '[\n' + reporters.map(function(reporter) {
      return 'require("' + getKarmaReporterPluginPath(reporter) + '")';
    }).join(',\n  ') + '\n]';

    //aggregate and append to karma.conf.js in the project root folder
    gulp
      .src(path.resolve(configFileName))
      .on('data', function(karmaConfigFile) {
        var contents = karmaConfigFile.contents.toString()
          .replace(filesAppendRegex, filesAppend)
          .replace(reportersAppendRegex, reportersAppend)
          .replace(reportersAppendRegex, reportersAppend)
          .replace(pluginsAppendRegex, pluginsAppend);
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
 * @param {Array.<string>} [reporters] The name of the karma reporter to use
 * @param {number} [bannerWidth] The width of banner comment, zero or omitted for none
 * @returns {stream.Through} A through strconcateam that performs the operation of a gulp stream
 */
function karmaRun(reporters, bannerWidth) {
  var options = {
    configFile: undefined
  };
  reporters = reporters || [];

  return through.obj(function transformFn(file, encoding, done) {
    options.configFile = file.path;
    done();
  },
  function streamFn(done) {
    var appPath = path.join(__dirname, 'karma-background.js');
    var data    = querystring.escape(JSON.stringify(options));
    var command = [ 'node', quote(appPath), data ].join(' ');

    childProcess.exec(command, { cwd: process.cwd() }, function reporter(stderr, stdout) {
      if (reporters.length > 0) {
        if (stdout) {
          process.stdout.write(stdout);
        }
        if (stderr) {
          process.stderr.write(stderr);
        }
        done();
        return;
      }

      //TODO @bguiz replace reporter function with a standard karma reporter,
      //and extract it to own module

      //default reporter by parsing the stdout and stderr of karma
      var report;
      if (stdout) {
        report = stdout
          .replace(/^\s+/gm, '')                                  // remove leading whitespace
          .replace(/^(LOG.*\n$)/gm, options.silent ? '' : '$1')   // remove logging
          .replace(/at\s+null\..*/gm, '')                         // remove file reference
          .replace(/\n\n/gm, '\n')                                // consolidate consecutive line breaks
          .replace(/^\n|\n$/g, '');                               // remove leading and trailing line breaks overall
      }
      else if (stderr) {
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

var yargsOptionDefiniton = {
  key: 'karmareporter',
  value: {
    describe: 'Specify a custom Karma reporter to use. ' +
      'Either a locally npm installed module, or an asolute path to one.',
    alias: ['k'],
    default: defaultReporterName,
    string:true,
  }
};
var checkKarmaReporter = yargs.createCheck()
  .withGate(function (argv) {
    return !argv.help;
  })
  .withTest({
    karmareporter: function(value) {
      if (typeof value !== 'undefined') {
        try {
          getKarmaReporterPluginPath(value);
        }
        catch (ex) {
          return 'Illegal value for "reporter"\n' + ex;
        }
      }
    },
  })
  .commit();

module.exports = {
  createConfig: karmaCreateConfig,
  run: karmaRun,
  yargsCheck: checkKarmaReporter,
  yargsOption: yargsOptionDefiniton,
};

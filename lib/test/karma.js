'use strict';

var path            = require('path');

var gulp            = require('gulp'),
    through         = require('through2'),
    querystring     = require('querystring'),
    lodashMerge     = require('lodash.merge'),
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

var defaultReporterName = 'karma-angularity-reporter';

var filesAppendRegex = /\/\*+\s*ANGULARITY_FILE_LIST\s*\*+\// ;
var reportersAppendRegex = /\/\*+\s*ANGULARITY_REPORTER_LIST\s*\*+\// ;
var pluginsAppendRegex = /\/\*+\s*ANGULARITY_PLUGIN_LIST\s*\*+\// ;
var karmaReporterMatchNameRegex = /^karma-(.+)-reporter$/ ;

/**
 * Determine the `require` path for a plugin.
 * Note that this require path must be absolute,
 * as it will not be required within this project,
 * but rather by the karma runner - and therefore the current directory
 * cannot be predicted.
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

  //Default reporter is a dependency of angularity
  var reporterPath = (reporterName === defaultReporterName) ?
    path.resolve(__dirname, '../../node_modules', defaultReporterName) :
    reporterName;
  //Specific reporters are expected to be dependencies of the local project
  reporterPath = (path.dirname(reporterName) === '.') ?
    path.resolve('node_modules', 'karma-' + reporterName + '-reporter') :
    reporterName;

  //Either way, the absolute path of the reporter is `require`d
  //Only to determine if it is indeed `require`able,
  //and enable fail fast if it is not.
  try {
    require(reporterPath);
  }
  catch (ex) {
    throw 'Get Karma Reporter Plugin Path: Attempt to require reporter from path ' +
      reporterPath + ' with no success.';
  }
  reporterPath = path.normalize(reporterPath);

  //NOTE quirk: nodejs identifies all windows (both win32 and win64) as win32
  if (process.platform === 'win32') {
    //Sanitise path for Windows
    //Replace any single backslash characters in file paths with
    //double backslash on windows; neither path.normalize nor path.resolve do this
    reporterPath = reporterPath.replace( /\\/g , '\\\\' );
  }
  return reporterPath;
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
  if (reporters.constructor !== Array || reporters.length === 0) {
    throw new Error('No reporters specified');
  }

  return through.obj(function transformFn(file, encoding, done) {
    options.configFile = file.path;
    done();
  },
  function streamFn(done) {
    var appPath = path.join(__dirname, 'karma-background.js');
    var data    = querystring.escape(JSON.stringify(options));
    var command = [ 'node', quote(appPath), data ].join(' ');

    //NOTE this workaround is necessary, see issue:
    //https://github.com/sindresorhus/supports-color/issues/13
    //TODO @bguiz remove workaround when issue has been resolved
    childProcess.exec(command, {
      cwd: process.cwd(),
      env: lodashMerge(process.env, {
        SUPPORTS_COLOR: true,
      }),
    }, function reporter(err, stdout, stderr) {
      //NOTE it is safe to ignore the error,
      //because karma-runner exits with a non-zero exit code when any tests fail.
      if (stdout) {
        process.stdout.write(stdout);
      }
      if (stderr) {
        process.stderr.write(stderr);
      }
      done();
      return;
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

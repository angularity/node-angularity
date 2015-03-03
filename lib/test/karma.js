'use strict';

var path            = require('path');

var gulp            = require('gulp'),
    through         = require('through2'),
    querystring     = require('querystring'),
    lodashMerge     = require('lodash.merge'),
    childProcess    = require('child_process');

var yargs           = require('../util/yargs'),
    platform        = require('../config/platform');

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
    throw 'Reporter name is unspecified';
  }

  //Default reporter is a dependency of angularity
  var reporterPath = (reporterName === defaultReporterName) ?
    path.resolve(__dirname, '../../node_modules', defaultReporterName) :
    reporterName;
  //Specific reporters are expected to be dependencies of the local project
  reporterPath = (path.dirname(reporterPath) === '.') ?
    path.resolve('node_modules', 'karma-' + reporterName + '-reporter') :
    reporterPath;

  //Either way, the absolute path of the reporter is `require`d
  //Only to determine if it is indeed `require`able,
  //and enable fail fast if it is not.
  try {
    require(reporterPath);
  }
  catch (ex) {
    throw 'Attempt to require reporter from path ' + reporterPath + ' with no success.';
  }
  reporterPath = path.normalize(reporterPath);

  if (platform.isWindows()) {
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
  return name;
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

  files.push('**/!(app|app-build|app-release|app-test)/*.js');

  files.push({
    'pattern': '**/*.map',
    'included': false
  });

  files.push({
    'pattern': '**/*.spec.js',
    'included': false
  });

  // add the bundles
  function transformFn(file, encoding, transformDone) {
    if (!file || !file.path) {
      throw 'Files must have paths';
    }
    if (path.extname(file.path) === '.js') {
      files.push(file.path);
    }
    transformDone();
  }

  function flushFn(flushDone) {
    /*jshint validthis:true */
    var stream = this;
    constructFile();

    function constructFile() {
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
          flushDone();
        });
    }
  }

  return through.obj(transformFn, flushFn);
}

/**
 * Run karma once only with the karma config file present in the input stream.
 * No output. Ends when the Karma process ends.
 * Runs karma in a child process, to avoid `process.exit()` called by karma.
 *
 * @param {Array.<string>} [reporters] The name of the karma reporter to use
 * @returns {stream.Through} A through stream intended to have a gulp stream piped through it
 */
function karmaRun(reporters) {
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

    var karmaBackground = childProcess.spawn('node', [appPath, data], {
      cwd: process.cwd(),
      stdio: [process.stdin, process.stdout, process.stderr],
      env: lodashMerge(process.env, {
        //NOTE this workaround is necessary, see issue:
        //https://github.com/sindresorhus/supports-color/issues/13
        //TODO @bguiz remove workaround when issue has been resolved
        SUPPORTS_COLOR: true
      })
    });
    karmaBackground.on('close', function() {
      done();
      return;
    });
  });
}

var yargsOptionDefinition = {
  key: 'karma-reporter',
  value: {
    describe: 'Specify a custom Karma reporter to use. Either a locally npm installed module, or an asolute path to ' +
    'one.',
    alias   : ['k'],
    default : defaultReporterName,
    string  : true
  }
};
var checkKarmaReporter = yargs.createCheck()
  .withGate(function (argv) {
    return !argv.help;
  })
  .withTest({
    'karma-reporter': function(value) {
      if (typeof value !== 'undefined') {
        try {
          getKarmaReporterPluginPath(value);
        }
        catch (ex) {
          return 'Illegal value for "karma-reporter": ' + ex;
        }
      }
    }
  })
  .commit();

module.exports = {
  createConfig: karmaCreateConfig,
  run         : karmaRun,
  yargsCheck  : checkKarmaReporter,
  yargsOption : yargsOptionDefinition
};

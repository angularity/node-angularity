'use strict';

var path         = require('path'),
    fs           = require('fs'),
    gutil        = require('gulp-util'),
    through      = require('through2'),
    querystring  = require('querystring'),
    lodashMerge  = require('lodash.merge'),
    childProcess = require('child_process');

var platform = require('../config/platform');

//TODO @bguiz get this from config
var defaultReporterName = 'karma-angularity-reporter';

var basePathRegex               = /['"]?\s*\/\*+\s*ANGULARITY_BASE_PATH\s*\*+\/\s*['"]?/ ;
var filesAppendRegex            = /\/\*+\s*ANGULARITY_FILE_LIST\s*\*+\// ;
var reportersAppendRegex        = /\/\*+\s*ANGULARITY_REPORTER_LIST\s*\*+\// ;
var pluginsAppendRegex          = /\/\*+\s*ANGULARITY_PLUGIN_LIST\s*\*+\// ;
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

  var reporterPath;

  // Default reporter is a dependency of angularity
  if (reporterName === defaultReporterName) {
    reporterPath = path.resolve(__dirname, '../../node_modules', defaultReporterName);
  }
  else {
    reporterPath = reporterName;
  }

  //Specific reporters are expected to be dependencies of the local project
  if (path.dirname(reporterPath) === '.') { //not an absolute path
    reporterPath = path.resolve('node_modules', 'karma-' +
      getKarmaReporterName(reporterName) + '-reporter');
  }

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
 * @param {string} reporterName Either the registered reporter name, or an absolute path for a karma reporter.
 * @return {string} The registered reporter name for use in the `reporters` section of the karma config file.
 */
function getKarmaReporterName(reporterName) {
  if (typeof reporterName !== 'string') {
    throw 'Reporter name is unspecified';
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
 * `ANGULARITY_FILE_LIST` in a block comment with the actual array of files.
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
  var files      = [ ];
  var additional = [
    {
      pattern : '**/*.js',
      included: false
    }, {
      pattern : '**/*.map',
      included: false
    }, {
      pattern : '**/*.spec.js',
      included: false
    }
  ];

  // add the bundles
  function transformFn(file, encoding, done) {
    if (!file || !file.path) {
      throw 'Files must have paths';
    }
    if (path.extname(file.path) === '.js') {
      files.push(file.relative);
    }
    done();
  }
  function flushFn(done) {
    /* jshint validthis:true */
    var stream = this;
    function requirePlugins(reporter) {
      return 'require("' + getKarmaReporterPluginPath(reporter) + '")';
    }
    function encode(value) {
      return JSON.stringify(value, null, 2).replace(/\"/g, '\'');
    }
    var filePath = path.resolve(configFileName);
    if (fs.existsSync(filePath)) {
      var contents = fs.readFileSync(filePath).toString()
        .replace(basePathRegex,        encode(process.cwd()))
        .replace(filesAppendRegex,     encode(files.concat(additional)))
        .replace(reportersAppendRegex, encode(reporters.map(getKarmaReporterName)))
        .replace(pluginsAppendRegex,   '[\n' + reporters.map(requirePlugins).join(',\n') + '\n]');
      stream.push(new gutil.File({
        path    : filePath,
        contents: new Buffer(contents)
      }));
    }
    done();
  }
  return through.obj(transformFn, flushFn);
}

/**
 * Run karma once only with the karma config file present in the input stream.
 * No output. Ends when the Karma process ends.
 * Runs karma in a child process, to avoid `process.exit()` called by karma.
 *
 * @returns {stream.Through} A through stream intended to have a gulp stream piped through it
 */
function karmaRun() {
  var options = {
    configFile: undefined // populated from the input stream
  };
  function transformFn(file, encoding, done) {
    options.configFile = file.path;
    done();
  }
  function flushFn(done) {
    var appPath = path.join(__dirname, 'karma-background.js');
    var data    = querystring.escape(JSON.stringify(options));

    childProcess
      .spawn('node', [appPath, data], {
        cwd: process.cwd(),
        env: lodashMerge(process.env, {
          //NOTE this workaround is necessary, see issue:
          //https://github.com/sindresorhus/supports-color/issues/13
          //TODO @bguiz remove workaround when issue has been resolved
          SUPPORTS_COLOR: true
        })
      })
      .on('close', function() {
        process.nextTick(done);
      })
      .stdout.on('data', function(chunk) {
        process.stdout.write(chunk);
      });
  }
  return through.obj(transformFn, flushFn);
}

module.exports = {
  createConfig       : karmaCreateConfig,
  run                : karmaRun,
  defaultReporterName: defaultReporterName,
  getPluginPath      : getKarmaReporterPluginPath
};

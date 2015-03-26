'use strict';

module.exports = function initTask(context) {
  var tyRun = require('taskYargsRun');

  var defaults = require('../lib/config/defaults'),
      platform = require('../lib/config/platform');

  // protect against api change
  ['gulp', 'runSequence', 'streams'].forEach(assertField(context));

  // persistence of defaults
  var config = defaults.getInstance('init')
    .file(platform.userHomeDirectory(), '.angularity')
    .defaults({
      name        : 'my-project',
      version     : '0.0.0',
      description : '',
      tag         : [],
      port        : 'random',
      npm         : true,
      bower       : true,
      karma       : true,
      jshint      : true,
      gitignore   : true,
      editorconfig: true
    });

  // options definition
  var options = [
    {
      keys      : ['defaults', 'z'],
      describe  : 'Set defaults',
      isOptional: true,
      default   : false
    }, {
      keys    : ['name', 'n'],
      describe: 'The project name',
      string  : true,
      default : config.get('name')
    }, {
      keys    : ['version', 'v'],
      describe: 'The project version',
      string  : true,
      default : config.get('version')
    }, {
      keys    : ['description', 'd'],
      describe: 'The project description',
      string  : true,
      default : config.get('description')
    }, {
      keys      : ['tag', 't'],
      describe  : 'A project tag',
      string    : true,
      isMultiple: true, // expects an array
      default   : config.get('tag')
    }, {
      keys    : ['port', 'p'],
      describe: 'A port for the development web server',
      alias   : 'p',
      default : config.get('port')
    }, {
      keys    : ['npm'],
      describe: 'Create package.json',
      boolean : true,
      default : config.get('npm')
    }, {
      keys    : ['bower'],
      describe: 'Create bower.json',
      boolean : true,
      default : config.get('bower')
    }, {
      keys    : ['karma'],
      describe: 'Create karma.conf.js',
      boolean : true,
      default : config.get('karma')
    }, {
      keys    : ['jshint'],
      describe: 'Create .jshintrc',
      boolean : true,
      default : config.get('jshint')
    }, {
      keys    : ['gitignore'],
      describe: 'Create .gitignore',
      boolean : true,
      default : config.get('gitignore')
    }, {
      keys    : ['editorconfig'],
      describe: 'Create .editorconfig',
      boolean : true,
      default : config.get('editorconfig')
    }
  ];

  return {
    name          : 'init',
    inherit       : ['help'],
    description   : [
      'The "init" task initialises a blank project. The given options initialise project defaults. Where omitted the ' +
      'global default will be in effect for the project.',
      '',
      'The following steps are taken. Some steps are gated by respective a flag. Default options may be globally ' +
      'defined or reset using the --defaults option.',
      '',
      '* project directory exists, else create',
      '* /app              exists, else create',
      '* /app/*.html       exists, else create',
      '* /app/*.scss       exists, else create',
      '* angularity.json   exists, else create',
      '* package.json      exists, else create    --npm',
      '* bower.json        exists, else create    --bower',
      '* karma.conf.js     exists, else create    --karma',
      '* .jshintrc         exists, else create    --jshint',
      '* .gitignore        exists, else create    --gitignore',
      '* .editorconfig     exists, else create    --editorconfig',
      '',
      'If a package.json is present initialisation will occur in the current directory. Otherwise a sub-directory is' +
      'created per the project name',
      '',
      'Where run on an existing project existing files will not be altered, delete existing files in order to change ' +
      'properties.',
      '',
      'Both the npm and bower packages are initially set private which you will need to clear in order to publish.',
      '',
      'Examples:',
      '',
      'angularity init -n todo                  Create project named "todo"',
      'angularity init --defaults -n pending    Change the name default to "pending"',
      'angularity init --defaults reset         Reset defaults'
    ].join('\n'),
    options       : options,
    checks        : [checkInitFlags],
    implementation: implementation
  };

  /**
   * TODO description
   */
  function checkInitFlags(argv) {
    if (argv.help) {
      return true;
    }
    else {
      //validate each of the options
      options.forEach(function(opt) {
        var key = opt.key;
        var value = argv[key];
        if (tyRun.checkFlagMissing(opt, key, value)) {
          return;
        }
        if ((key !== 'port') && (key !== 'defaults')) {
          // skip the valid types test for port, as will be done later
          // ensure options correspond to the types that they were defined as belonging to
          tyRun.checkFlagType(opt, key, value);
        }

        // specific checks
        if (key === 'version') {
          // version needs an additional test than the default one for a string
          if (!( /\d+\.\d+\.\d+[-\w\d]*/ ).test(value)) {
            throw new Error('version must be 3-term semver string');
          }
        }
        else if (key === 'port') {
          var valueType = (typeof value);
          // port gets special treatment because it is valid with more than one type
          if ((valueType === 'number' && isNaN(parseInt(value))) ||
            (valueType === 'string' && value !== 'random') ||
            (valueType !== 'string' && valueType !== 'number')) {
            console.log('port', value, 'valueType', valueType);
            throw new Error('Port must be an integer, or "random"');
          }
        }
        else if (key === 'defaults') {
          if (!(/^(true|false|reset)$/.test(String(argv.defaults)))) {
            throw new Error('Unrecognised value for defaults flag, expected true|false|reset.');
          }
        }
      });
      return true;
    }
  }

  /**
   * TODO description
   * @param cliArgs
   */
  function implementation(cliArgs) {
    var gulp        = context.gulp,
        runSequence = context.runSequence,
        streams     = context.streams;

    var gutil       = require('gulp-util'),
        path        = require('path'),
        fs          = require('fs'),
        template    = require('lodash.template'),
        merge       = require('lodash.merge');

    var hr = require('../lib/util/hr');

    var TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'angularity');

    var templateParams;

    gulp.task('init', function (done) {
      console.log(hr('-', 80, 'init'));

      // augment or adjust yargs parameters
      var port = (cliArgs.port === 'random') ? Math.floor(Math.random() * (65536 - 49152) + 49152) : cliArgs.port;
      var tags = []
        .concat(cliArgs.tag)   // yargs will convert multiple --tag flags to an array
        .filter(Boolean);
      templateParams = merge({}, cliArgs, { port: port, tags: JSON.stringify(tags) }); // must stringify lists

      // set defaults
      if (cliArgs.defaults) {
        ((cliArgs.defaults === 'reset') ? config.revert() : config.set(cliArgs))
          .changeList()
          .forEach(function (key) {
            gutil.log('default ' + key + ': ' + JSON.stringify(config.get(key)));
          });
        gutil.log('wrote file ' + config.commit());
      }
      // else run the selected items
      else {
        var taskList = [
          'init:subdir',
          'init:composition',
          'init:angularity',
          cliArgs.npm          && 'init:npm',
          cliArgs.bower        && 'init:bower',
          cliArgs.karma        && 'init:karma',
          cliArgs.jshint       && 'init:jshint',
          cliArgs.gitignore    && 'init:gitignore',
          cliArgs.editorconfig && 'init:editorconfig'
        ]
        .filter(Boolean);
        if (taskList.length > 0) {
          runSequence.apply(runSequence, taskList.concat(done));
        } else {
          done();
        }
      }
    });

    gulp.task('init:subdir', function () {
      var hasPackageJson = fs.existsSync(path.resolve('package.json'));
      if (!hasPackageJson) {
        mkdirIfNotExisting(cliArgs.name);
        process.chdir(path.resolve(cliArgs.name));  // !! changing cwd !!
      }
    });

    gulp.task('init:composition', function () {
      mkdirIfNotExisting(streams.APP);
      ['html', 'js', 'scss']
        .forEach(function eachExt(ext) {
          if (!anyFileOfType(ext, streams.APP)) {
            writeTemplate('index.' + ext, streams.APP);
          }
        });
    });

    gulp.task('init:angularity', function () {
      writeTemplate('angularity.json');
    });

    gulp.task('init:npm', function () {
      writeTemplate('package.json');
    });

    gulp.task('init:bower', function () {
      writeTemplate('bower.json');
    });

    gulp.task('init:karma', function () {
      writeTemplate('karma.conf.js', null, 1);
    });

    gulp.task('init:jshint', function () {
      copyTemplateSync('.jshintrc');
    });

    gulp.task('init:gitignore', function () {
      copyTemplateSync('.gitignore');
    });

    gulp.task('init:editorconfig', function () {
      copyTemplateSync('.editorconfig');
    });

    function mkdirIfNotExisting(projectRelativePath) {
      var absolute = path.resolve(projectRelativePath);
      var exists   = fs.existsSync(absolute);
      var isValid  = exists && fs.statSync(absolute).isDirectory();
      if (!isValid) {
        if (exists) {
          fs.unlinkSync(absolute);
        }
        fs.mkdirSync(absolute);
        gutil.log('created directory ' + projectRelativePath);
      }
    }

    function anyFileOfType(ext, subdir) {
      return fs.readdirSync(path.resolve(subdir || '.'))
        .some(function testJS(filename) {
          return (path.extname(filename) === ('.' + ext));
        });
    }

    function writeTemplate(filename, subdir, portOffset) {
      var srcAbsolute  = path.join(TEMPLATE_PATH, filename);
      var destRelative = path.join(subdir || '.', filename);
      var destAbsolute = path.resolve(destRelative);
      if (fs.existsSync(srcAbsolute) && !fs.existsSync(destAbsolute)) {
        var partial = fs.readFileSync(srcAbsolute).toString();
        var params  = merge({}, templateParams, {
            port: portOffset ? (templateParams.port + portOffset) : templateParams.port
          });
        var merged  = template(partial, params);
        fs.writeFileSync(destAbsolute, merged);
        gutil.log('created file ' + destRelative);
      }
    }

    function copyTemplateSync(filename, subdir) {
      var srcAbsolute = path.join(TEMPLATE_PATH, filename);
      var destRelative = path.join(subdir || '.', filename);
      var destAbsolute = path.resolve(destRelative);
      if (fs.existsSync(srcAbsolute) && !fs.existsSync(destAbsolute)) {
        var templateContent = fs.readFileSync(srcAbsolute).toString();
        fs.writeFileSync(destAbsolute, templateContent);
        gutil.log('created file ' + destRelative);
      }
    }
  }

};

/**
 * TODO move this to package angularity-util?
 */
function assertField(context) {
  return function assertForField(field) {
    if (!context[field]) {
      throw new Error('Plugin Incompatibility: Context must specify "' + field + '"');
    }
  };
}

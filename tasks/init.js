'use strict';

var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    wordwrap    = require('wordwrap'),
    runSequence = require('run-sequence'),
    path        = require('path'),
    fs          = require('fs'),
    template    = require('lodash.template'),
    merge       = require('lodash.merge');

var defaults = require('../lib/config/defaults'),
    platform = require('../lib/config/platform'),
    yargs    = require('../lib/util/yargs'),
    hr       = require('../lib/util/hr'),
    streams  = require('../lib/config/streams');

var TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'angularity');

var cliArgs;
var templateParams;

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

var check = yargs.createCheck()
  // don't check if we are just accessing help
  .withGate(function (argv) {
    return !argv.help;
  })
  .withTest({
    name: function(value) {
      if (typeof value !== 'string') {
        return 'name must be a string';
      } else if (value.length === 0) {
        return 'name must not be zero length';
      }
    },
    version: function(value) {
      if (typeof value !== 'string') {
        return 'version must be a valid string';
      } else if (!/\d+\.\d+\.\d+[-\w\d]*/.test(value)) {
        return 'version must be 3-term semver string';
      }
    },
    description: function (value) {
      if (typeof value !== 'string') {
        return 'description must be a string';
      }
    },
    tag: function(value) {
      [ ].concat(value).forEach(function (value) {
        if (typeof value !== 'string') {
          return 'tag must be a valid string';
        } else if (value.length === 0) {
          return 'name must not be zero length';
        }
      });
    },
    port: function (value) {
      switch (typeof value) {
        case 'number':
          if (isNaN(parseInt(value))) {
            return 'port must be integer';
          }
          break;
        case 'string':
          if (value === 'random') break;
        default:
          return 'port must be an integer or the keyword "random"';
      }
    },
    npm : function (value) {
      if (typeof value !== 'boolean') {
        return 'bower must be a boolean';
      }
    },
    karma : function (value) {
      if (typeof value !== 'boolean') {
        return 'karma must be a boolean';
      }
    },
    jshint : function (value) {
      if (typeof value !== 'boolean') {
        return 'jshint must be a boolean';
      }
    },
    gitignore : function (value) {
      if (typeof value !== 'boolean') {
        return 'gitignore must be a boolean';
      }
    },
    editorconfig : function (value) {
      if (typeof value !== 'boolean') {
        return 'editorconfig must be a boolean';
      }
    }
  })
  .commit();

yargs.getInstance('init')
  .usage(wordwrap(2, 80)([
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
    'Where run on an exising project existing files will not be altered, delete existing files in order to change ' +
    'properties.',
    '',
    'Both the npm and bower packages are initially set private which you will need to clear in order to publish.'
  ].join('\n')))
  .example('angularity init -n todo', 'Create project named "todo"')
  .example('angularity init --defaults -n pending', 'Change the name default to "pending')
  .example('angularity init --defaults reset', 'Reset defaults')
  .options('help', {
    describe: 'This help message',
    alias   : [ 'h', '?' ],
    boolean : true
  })
  .options('defaults', {
    describe: 'Set defaults',
    alias   : 'z',
    string  : true
  })
  .options('name', {
    describe: 'The project name',
    alias   : 'n',
    string  : true,
    default : config.get('name')
  })
  .options('version', {
    describe: 'The project version',
    alias   : 'v',
    string  : true,
    default : config.get('version')
  })
  .options('description', {
    describe: 'The project description',
    alias   : 'd',
    string  : true,
    default : config.get('description')
  })
  .options('tag', {
    describe: 'A project tag',
    alias   : 't',
    string  : true,
    default : config.get('tag')
  })
  .options('port', {
    describe: 'A port for the development web server',
    alias   : 'p',
    default : config.get('port')
  })
  .options('npm', {
    describe: 'Create package.json',
    boolean : true,
    default : config.get('npm')
  })
  .options('bower', {
    describe: 'Create bower.json',
    boolean : true,
    default : config.get('bower')
  })
  .options('karma', {
    describe: 'Create karma.conf.js',
    boolean : true,
    default : config.get('karma')
  })
  .options('jshint', {
    describe: 'Create .jshintrc',
    boolean : true,
    default : config.get('jshint')
  })
  .options('gitignore', {
    describe: 'Create .gitignore',
    boolean : true,
    default : config.get('gitignore')
  })
  .options('editorconfig', {
    describe: 'Create .editorconfig',
    boolean : true,
    default : config.get('editorconfig')
  })
  .strict()
  .check(yargs.subCommandCheck)
  .check(check)
  .wrap(80);

gulp.task('init', function (done) {
  console.log(hr('-', 80, 'init'));

  // find the yargs instance that is most appropriate for the given command line parameters
  cliArgs = yargs.resolveArgv();

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
        cliArgs.npm && 'init:npm',
        cliArgs.bower && 'init:bower',
        cliArgs.karma && 'init:karma',
        cliArgs.jshint && 'init:jshint',
        cliArgs.gitignore && 'init:gitignore',
        cliArgs.editorconfig && 'init:editorconfig'
      ]
      .filter(Boolean)
      .concat(done);
    runSequence.apply(runSequence, taskList);
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

function padded(length) {
  return function(text) {
    return (text + (new Array(length)).join(' ')).slice(0, length);
  }
}

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
    var params  = merge({ }, templateParams, {
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
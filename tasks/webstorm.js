'use strict';

var gulp         = require('gulp'),
    gutil        = require('gulp-util'),
    wordwrap     = require('wordwrap'),
    runSequence  = require('run-sequence'),
    fs           = require('fs'),
    path         = require('path'),
    template     = require('lodash.template'),
    ideTemplate  = require('ide-template');

var defaults = require('../lib/config/defaults'),
    platform = require('../lib/config/platform'),
    streams  = require('../lib/config/streams'),
    yargs    = require('../lib/util/yargs'),
    hr       = require('../lib/util/hr');

var TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'webstorm');

var cliArgs;
// Load the global config for defaults
var config = defaults.getInstance('webstorm')
  .file(platform.userHomeDirectory(), '.angularity')
  .defaults({
    'project'  : true,
    'tools'    : true,
    'codestyle': true,
    'templates': true,
    'launch'   : true
  });

var check = yargs.createCheck()
  // don't check if we are just accessing help
  .withGate(function (argv) {
    return !(argv.help);
  })
  .withTest(validateLaunchPath)
  .withTest({subdir: validateSubDirectory})
  // don't check for a project if we are just setting defaults
  .withGate(function (argv) {
    return !(argv.defaults);
  })
  .withTest(angularityProjectPresent)
  .commit();

yargs.getInstance('webstorm')
  .usage(wordwrap(2, 80)([
    'The "webstorm" task initialises webstorm for a project in the current working directory and launches the IDE.',
    '',
    'Where the IDE is installed in a non-standard location the full path to the IDE should be used in place of the ' +
    'boolean in --launch.',
    '',
    'The following steps are taken. Some steps are gated by respective a flag. Default options may be globally ' +
    'defined or reset using the --defaults option.',
    '',
    '* Setup project (resources, debug config, suppressors)   --project',
    '* Create external tools that launch angularity           --tools',
    '* Set coding style                                       --codestyle',
    '* Add code templates                                     --templates',
    '* Launch IDE                                             --launch',
  ].join('\n')))
  .example('angularity webstorm', 'Run this task')
  .example('angularity webstorm --defaults -l <some-path>', 'Set a default executable path')
  .example('angularity webstorm --defaults reset', 'Reset defaults')
  .options('help', {
    describe: 'This help message',
    alias   : ['h', '?'],
    boolean : true
  })
  .options('defaults', {
    describe: 'Set defaults',
    alias   : 'z',
    string  : true
  })
  .options('subdir', {
    describe: 'Navigate to the sub-directory specified',
    alias   : 's',
    string  : true,
    default : config.get('subdir')
  })
  .options('project', {
    describe: 'Setup project',
    alias   : 'p',
    boolean : true,
    default : config.get('project')
  })
  .options('tools', {
    describe: 'Install external tools',
    alias   : 't',
    boolean : true,
    default : config.get('tools')
  })
  .options('codestyle', {
    describe: 'Install the Javascript code style',
    alias   : 'r',
    boolean : true,
    default : config.get('codestyle')
  })
  .options('templates', {
    describe: 'Add code templates',
    alias   : 't',
    boolean : true,
    default : config.get('templates')
  })
  .options('launch', {
    describe: 'Launch the IDE following setup',
    alias   : 'l',
    string  : true,
    default : config.get('launch')
  })
  .strict()
  .check(yargs.subCommandCheck)
  .check(check)
  .wrap(80);

gulp.task('webstorm', function (done) {
  console.log(hr('-', 80, 'webstorm'));

  // Find the yargs instance that is most appropriate for the given command line parameters
  cliArgs = validateLaunchPath(yargs.resolveArgv());

  cliArgs = yargs.resolveArgv();

  if (cliArgs.taskName === 'init') {
    cliArgs = config.get(); // default arguments when called by the "init" task
  }

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
      cliArgs.subdir && 'webstorm:subdir',
      cliArgs.project && 'webstorm:project',
      cliArgs.templates && 'webstorm:templates',
      cliArgs.tools && 'webstorm:tools',
      cliArgs.codestyle && 'webstorm:codestyle',
      cliArgs.launch && 'webstorm:launch'
    ].filter(Boolean).concat(done);

    runSequence.apply(runSequence, taskList);
  }
});

gulp.task('webstorm:subdir', function () {
  process.chdir(path.resolve(cliArgs.subdir));  // !! changing cwd !!
});

gulp.task('webstorm:project', function () {
  var properties = require(path.resolve('angularity.json'));

  var context = {
    projectName         : properties.name,
    jshintPath          : '$PROJECT_DIR$/.jshintrc',
    jsDebugPort         : properties.port,
    javascriptVersion   : 'es6',
    watcherSuppressedTasks: 'Traceur compiler;SCSS',
    JsKarmaPackageDirSetting: 'C:\\Program Files\\nodejs\\node_modules\\karma', // todo resolve by platform
    contentPaths        : [
      {content: 'file://' + process.cwd()}
    ],
    libraries           : [
      'jasmine-DefinitelyTyped',
      'angular'
    ],
    selectedDebugName   : 'JavaScript Debug.' + properties.name,
    karmaDebugConfiguration : [
      {
        name: properties.name,
        configFile: '$PROJECT_DIR$/' + streams.TEST + '/karma.conf.js',
        browsers: 'Chrome',
        env: [],
        tasks: [
          {
            name: 'Tool_Angularity_test --debug'
          }
        ]
      }
    ],
    jsDebugConfiguration: subdirectoriesWithFile(streams.APP, 'index.html')
      .map(function (directory) {
        var directoryTerms = directory.split(path.sep).slice(1);
        return {
          name   : [properties.name].concat(directoryTerms).join('/'),
          uri    : 'http://localhost:' + [properties.port].concat(directoryTerms).join('/'),
          mapping: {
            url: 'http://localhost:' + properties.port, localFile: '$PROJECT_DIR$'
          }
        };
      }),
    plainText           : [
      'file://$PROJECT_DIR$/app-build/index.css',
      'file://$PROJECT_DIR$/app-build/index.js',
      'file://$PROJECT_DIR$/app-test/index.js'
    ],
    resourceRoots       : [
      'file://$PROJECT_DIR$',
      'file://$PROJECT_DIR$/node_modules',
      'file://$PROJECT_DIR$/bower_components'
    ],
    projectPane         : template(fs.readFileSync(path.join(TEMPLATE_PATH, 'projectPane.xml')), {
      rootPath: properties
    })
  };
  ideTemplate.webStorm.createProject(process.cwd(), context);
});

gulp.task('webstorm:templates', function () {
  ideTemplate.webStorm.copyFileTemplates(path.join(TEMPLATE_PATH, 'fileTemplates'));
});

gulp.task('webstorm:tools', function () {
  ideTemplate.webStorm.createExternalTool({
    name : 'Angularity',
    tools: ['test', 'watch', 'watch --unminified', 'build', 'build --unminified', 'release']
      .map(createWebstormExternalToolContext)
  }, 'Angularity.xml');
});

gulp.task('webstorm:codestyle', function () {
  ideTemplate.webStorm.copyCodeStyle(path.join(TEMPLATE_PATH, 'Angularity.xml'));
});

gulp.task('webstorm:launch', function () {
  ideTemplate.webStorm.open(process.cwd());
});

function createWebstormExternalToolContext(parameters) {
  return {
    name               : parameters,
    showInMainMenu     : 'true',
    showInEditor       : 'true',
    showInProject      : 'true',
    showInSearchPopup  : 'true',
    disabled           : 'false',
    useConsole         : 'true',
    showConsoleOnStdOut: 'false',
    showConsoleOnStdErr: 'false',
    synchronizeAfterRun: 'true',
    exec               : [{
      name : 'COMMAND',
      value: 'angularity' + (platform.isWindows() ? '.cmd' : '')
    }, {
      name : 'PARAMETERS',
      value: parameters
    }, {
      name : 'WORKING_DIRECTORY',
      value: '$ProjectFileDir$'
    }],
    filter             : [{
      name : 'NAME',
      value: 'File'
    }, {
      name : 'DESCRIPTION',
      value: 'Match the standard console output to make error messages clickable.'
    }, {
      name : 'REGEXP',
      value: '$FILE_PATH$\\:$LINE$\\:$COLUMN$'
    }]
  };
}

/**
 * yargs check for a valid --launch parameter
 * Additionally parses true|false strings to boolean literals
 * @param argv
 */
function validateLaunchPath(argv) {
  switch (argv.launch) {
    case false:
    case 'false':
      argv.launch = false;
      break;
    case true:
    case 'true':
      if (ideTemplate.webStorm.validateExecutable()) {
        argv.launch = true;
      } else {
        return 'Cannot find Webstorm executable, you will have to specify it explicitly.';
      }
      break;
    default:
      if (!fs.existsSync(path.normalize(argv.launch))) {
        return 'Launch path is not valid or does not exist.';
      }
  }
  return true;
}

function validateSubDirectory(value) {
  if (value) {
    var subdir = path.resolve(value);
    var isValid = fs.existsSync(subdir) && fs.statSync(subdir).isDirectory();
    if (!isValid) {
      return 'The specified subdirectory does not exist.';
    }
  }
}

/**
 * Find all subdirectories of the base, recursively
 * @param base The base directory to start in
 * @param filename A filename that needs to be found for the path to be added
 * @return all subdirectories of the base, split by path separator
 */
function subdirectoriesWithFile(base, filename) {
  var result = [];
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    if (fs.existsSync(path.join(base, filename))) {
      result.push(base);
    }
    fs.readdirSync(base)
      .forEach(function (subdir) {
        result.push.apply(result, subdirectoriesWithFile(path.join(base, subdir), filename));
      });
  }
  return result;
}

// Todo move method to util location.
function angularityProjectPresent(argv) {
  var projectPath = (argv.subdir) ? path.join(argv.subdir, 'angularity.json') : 'angularity.json';
  if (!fs.existsSync(path.resolve(projectPath))) {
    return 'Current working directory (or specified subdir) is not a valid angularity project. ' +
      'Try running the "init" command first.';
  }
}
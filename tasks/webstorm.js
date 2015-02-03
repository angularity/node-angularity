'use strict';

var gulp         = require('gulp'),
    gutil        = require('gulp-util'),
    wordwrap     = require('wordwrap'),
    runSequence  = require('run-sequence'),
    fs           = require('fs'),
    path         = require('path'),
    childProcess = require('child_process'),
    template     = require('lodash.template'),
    ideTemplate  = require('ide-template');

var defaults = require('../lib/config/defaults'),
    platform = require('../lib/config/platform'),
    streams  = require('../lib/config/streams'),
    yargs    = require('../lib/util/yargs'),
    hr       = require('../lib/util/hr');

var TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'webstorm');

var cliArgs;

var config = defaults.getInstance('webstorm')
  .file(platform.userHomeDirectory(), '.angularity')
  .defaults({
    'project'  : true,
    'tools'    : true,
    'rules'    : true,
    'templates': true,
    'launch'   : true
  });

var check = yargs.createCheck()
  .withGate(function (argv) {
    return !argv.help;
  })
  .withTest(validateLaunchPath)
  .withTest(function angularityProjectPresent(argv) {
    var projectPath = (argv.subdir) ? path.join(argv.subdir, 'angularity.json') : 'angularity.json';
    if (!fs.existsSync(path.resolve(projectPath))) {
      return 'Current working directory (or specified subdir) is not a valid project. Try running the "init" ' +
        'command first.';
    }
  })
  .withTest({
    subdir: function (value) {
      if (value) {
        var subdir  = path.resolve(value);
        var isValid = fs.existsSync(subdir) && fs.statSync(subdir).isDirectory();
        if (!isValid) {
          return 'The specified subdirectory does not exist.';
        }
      }
    }
  })
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
    '* Set coding style rules                                 --rules',
    '* Add code templates                                     --templates',
    '* Launch IDE                                             --launch',
  ].join('\n')))
  .example('angularity webstorm', 'Run this task')
  .example('angularity webstorm --defaults -l \<some-path\>', 'Set a default executable path')
  .example('angularity webstorm --defaults reset', 'Reset defaults')
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
  .options('rules', {
    describe: 'Set style rules',
    alias   : 'r',
    boolean : true,
    default : config.get('rules')
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

  // find the yargs instance that is most appropriate for the given command line parameters
  cliArgs = validateLaunchPath(yargs.resolveArgv());
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
  var context    = {
    projectName         : properties.name,
    jshintPath          : '$PROJECT_DIR$/.jshintrc',
    jsDebugPort         : properties.port,
    javascriptVersion   : 'es6',
    contentPaths        : [
        { content: 'file://' + process.cwd() }
      ],
    libraries           : [
        'jasmine-DefinitelyTyped',
        'angular'
      ],
    selectedDebugName   : properties.name,
    jsDebugConfiguration: subdirectoriesWithFile(streams.APP, 'index.html')
      .map(function(directory) {
        var directoryTerms = directory.split(path.sep).slice(1);
        return {
          name   : [properties.name].concat(directoryTerms).join('/'),
          uri    : 'http://localhost:' + [properties.port].concat(directoryTerms).join('/'),
          mapping: {
            url: 'http://localhost:' + properties.port, localFile: '$PROJECT_DIR$'
          }
        }
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
  var srcDirectory  = path.join(TEMPLATE_PATH, 'fileTemplates');
  var destDirectory = path.join(userPreferencesDirectory(), 'fileTemplates');
  fs.readdirSync(srcDirectory)
    .forEach(function eachTemplate(filename) {
      var srcPath  = path.join(srcDirectory, filename);
      var destPath = path.join(destDirectory, filename);
      if (!fs.existsSync(destPath)) {
        gutil.log('wrote template ' + filename);
        fs.writeFileSync(destPath, fs.readFileSync(srcPath))
      }
    });
// TODO review with @impaler
//  ideTemplate.webStorm.copyFileTemplates(fileTemplatePath);
});

gulp.task('webstorm:tools', function () {
  function createNode(parameters) {
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
      exec               : [ {
          name : 'COMMAND',
          value: 'angularity' + (platform.isWindows() ? '.cmd' : '')
        }, {
          name : 'PARAMETERS',
          value: parameters
        }, {
          name : 'WORKING_DIRECTORY',
          value: '$ProjectFileDir$'
        } ],
      filter             : [ {
          name : 'NAME',
          value: 'File'
        }, {
          name : 'DESCRIPTION',
          value: 'Match the standard console output to make error messages clickable.'
        }, {
          name : 'REGEXP',
          value: '$FILE_PATH$\\:$LINE$\\:$COLUMN$'
        } ]
    };
  }
  var destPath = path.join(userPreferencesDirectory(), 'tools', 'Angularity.xml');
  var content  = ideTemplate.webStorm.createExternalTool({
    name : 'Angularity',
    tools: ['test', 'watch', 'watch --unminified', 'build', 'build --unminified', 'release'].map(createNode)
  });
  fs.writeFileSync(destPath, content);
// TODO review with @impaler
//  ideTemplate.webStorm.writeExternalTool(toolContent, 'Angularity.xml');
});

gulp.task('webstorm:launch', function () {
  var executable = (cliArgs.launch === true) ? executablePath() : path.normalize(cliArgs.launch);
  gutil.log('launching ' + executable);
  childProcess.spawn(executable, [process.cwd()], { detached: true });
// TODO review with @impaler
//  ideTemplate.webStorm.open(project.destination);
});

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
      if (!fs.existsSync(executablePath())) {
        return 'Cannot find Webstorm executable, you will have to specify it explicitly.';
      } else {
        argv.launch = true;
        break;
      }
    default:
      if (!fs.existsSync(path.normalize(argv.launch))) {
        return 'Launch path is not valid or does not exist.';
      }
  }
  return argv;
}

/**
 * The user preferences directory for webstorm on the current platform
 * @returns {string}
 */
function userPreferencesDirectory() {
  var home = platform.userHomeDirectory();
  return maximisePath(home, /^\.WebStorm\s*[.\d]+$/, 'config') ||
    maximisePath(home, 'Library', 'Preferences', /^WebStorm\s*[.\d]+$/);
}

/**
 * The user preferences directory for webstorm on the current platform
 * @returns {string}
 */
function executablePath() {
  if (platform.isWindows()) {
    return maximisePath(reduceDirectories('C:/Program Files/JetBrains', 'C:/Program Files (x86)/JetBrains'),
  		/^WebStorm\s*[.\d]+$/, 'bin', 'Webstorm.exe');
  } else {
    return '/Applications/WebStorm.app/Contents/MacOS/webide';
  }
}

/**
 * Match the path defined by the path elements, where some may be RegExp.
 * Where there is more than one candidate choose the one with greatest interger component.
 * @param {...string|RegExp} elements Any number of path elements
 * @returns {string} A true concatentated path where found, else undefined
 */
function maximisePath() {
  function compare(a, b) {
    var intA = parseInt(/\d+/.exec(a));
    var intB = parseInt(/\d+/.exec(b));
    if        (isNaN(intA) || (intB > intA)) {
      return +1;
    } else if (isNaN(intB) || (intA > intB)) {
      return -1;
    } else {
      return 0;
    }
  }
  function eachDirectoryItem(base, pattern) {
    return function eachDirectoryItem(item) {
      var resolved    = path.resolve(path.join(base, item));
      var isDirectory = fs.statSync(resolved).isDirectory();
      var isMatch = (typeof pattern === 'string') ? (item === pattern) :
        ('test' in pattern) ? pattern.test(item) : false;
      return isDirectory && isMatch;
    };
  }
  var elements = Array.prototype.slice.call(arguments);
  for (var i = 1; i < elements.length; i++) {
    var directory = path.resolve(path.join.apply(path, elements.slice(0, i)));
    var matches   = fs.readdirSync(directory)
      .filter(eachDirectoryItem(directory, elements[i]))
      .sort(compare);
    if (matches.length === 0) {
      return null;
    } else {
      elements[i] = matches[0];
    }
  }
  return path.resolve(elements.join(path.sep));
}

/**
 * Pick the first valid directory from any of the given arguments
 * @param {...string} candidates Any number of possible directories
 * @returns {string} The first valid directory or else undefined
 */
function reduceDirectories() {
  return Array.prototype.slice.call(arguments)
    .map(function (candidate) {
      return path.normalize(candidate);
    })
    .filter(function (candidate) {
      return fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
    })
    .shift();
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
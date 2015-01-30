'use strict';

var gulp         = require('gulp'),
    gutil        = require('gulp-util'),
    wordwrap     = require('wordwrap'),
    runSequence  = require('run-sequence'),
    fs           = require('fs'),
    path         = require('path'),
    childProcess = require('child_process'),
    ideTemplate  = require('ide-template');

var config = require('../lib/config/config'),
    yargs  = require('../lib/util/yargs'),
    hr     = require('../lib/util/hr');

var TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'webstorm');
var IS_WINDOWS    = (['win32', 'win64'].indexOf(ideTemplate.util.platform) >= 0);

var cliArgs = yargs.resolveInstance;

yargs.getInstance('webstorm')
  .usage(wordwrap(2, 80)([
    'The "webstorm" task initialises webstorm for a project in the current working directory and launches the IDE.',
    '',
    'Where the IDE is installed in a non-standard location the full path to the IDE should be used in place of the ' +
    'boolean in launch.',
    '',
    'The following steps are taken. Where a step is gated by a flag it is stated as "--flag [default value]".',
    '',
    '* Setup project (resources, launch, jshint, watchers..)  --project [true]',
    '* Create external tools that launch angularity           --tools [true]',
    '* Set coding style                                       --style [true]',
    '* Add code templates                                     --templates [true]',
    '* Launch IDE                                             --launch [true]',
    '',
    'Where project defaults are supplied, they overwrite any existing value in angularity.json. Both the npm and ' +
    'bower packages are initially set private which you will need to clear in order to publish.'
  ].join('\n')))
  .example('$0 webstorm', 'Run this task')
  .describe('h', 'This help message').alias('h', '?').alias('h', 'help')
  .describe('p', 'Setup project').alias('p', 'project').boolean('p').default('p', true)
  .describe('e', 'Install external tools').alias('e', 'tools').boolean('e').default('e', true)
  .describe('s', 'Set coding style').alias('s', 'style').boolean('s').default('s', true)
  .describe('t', 'Add code templates').alias('t', 'templates').boolean('t').default('t', true)
  .describe('l', 'Launch the IDE following setup').alias('l', 'launch').default('l', true)
  .strict()
  .check(yargs.subCommandCheck)
  .wrap(80);

gulp.task('webstorm', function (done) {
  console.log(hr('-', 80, 'webstorm'));
  if (fs.existsSync(path.resolve('angularity.json'))) {
    var taskList = [
      cliArgs().project && 'webstorm:project',
      cliArgs().templates && 'webstorm:templates',
      cliArgs().tools && 'webstorm:tools',
      cliArgs().launch && 'webstorm:launch'
    ].filter(Boolean).concat(done);
    runSequence.apply(runSequence, taskList);
  } else {
    gutil.log('Fail');
    gutil.log('Current directory is not a valid project. First run the "init" task.')
  }
});

gulp.task('webstorm:project', function () {

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
          value: 'angularity' + (IS_WINDOWS ? '.cmd' : '')
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
    tools: ['test', 'watch', 'watch -unminified', 'build', 'build -unminified', 'release'].map(createNode)
  });
  fs.writeFileSync(destPath, content);
// TODO review with @impaler
//  ideTemplate.webStorm.writeExternalTool(toolContent, 'Angularity.xml');
});

gulp.task('webstorm:launch', function () {
  var executablePath = (typeof cliArgs().tools === 'string') ? path.normalise(cliArgs().tools) : executablePath();
  if (fs.existsSync(executablePath)) {
    childProcess.exec(executablePath, process.cwd())
// TODO review with @impaler
//  ideTemplate.webStorm.open(project.destination);
  }
});

/**
 * The user preferences directory for webstorm on the current platform
 * @returns {string}
 */
function userPreferencesDirectory() {
  return (IS_WINDOWS) ?
    maximisePath(process.env.USERPROFILE, /\.WebStorm\d+/, 'config') :
    maximisePath(process.env.HOME, 'Library', 'Preferences', /WebStorm\d+/);
}

/**
 * The user preferences directory for webstorm on the current platform
 * @returns {string}
 */
function executablePath() {
  return (IS_WINDOWS) ? path.join(
      reduceDirectories('C:/Program Files/JetBrains', 'C:/Program Files (x86)/JetBrains'),
      maximisePath(/\WebStorm\d+/, 'config', 'bin'),
      'WebStorm.exe'
    ) : path.join('/Applications/WebStorm.app/Contents/MacOS/webide');
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
    .map(function () {
      return path.normalise(candidate);
    })
    .filter(function (candidate) {
      return fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
    }).shift();
}



function projectContext(project) {
  // Adjust a preset project pane node to have the project tree open at src.
  var projectPane = fs.readFileSync(__dirname + '/projectPane.xml');
  projectPane = template(projectPane, {rootPath: project.projectName});

  return {
    projectName         : project.projectName,
    jshintPath          : '$PROJECT_DIR$/.jshintrc',
    jsDebugPort         : project.projectConfig.serverHttpPort,
    javascriptVersion   : config.ES5,
    contentPaths        : [
      {
        content: 'file://' + project.destination
      }
    ],
    libraries           : ['jasmine-DefinitelyTyped', 'angular'],
    selectedDebugName   : 'JavaScript Debug.' + project.projectName,
    jsDebugConfiguration: [
      {
        name   : project.projectName,
        uri    : 'http://localhost:' + project.projectConfig.serverHttpPort + '/app',
        mapping: {
          url      : 'http://localhost:' + project.projectConfig.serverHttpPort,
          localFile: '$PROJECT_DIR$'
        }
      }
    ],
    plainText           : [
      'file://$PROJECT_DIR$/build/app/main.css',
      'file://$PROJECT_DIR$/build/app/main.js'
    ],
    resourceRoots       : [
      'file://$PROJECT_DIR$/src/js-lib',
      'file://$PROJECT_DIR$/src/css-lib',
      'file://$PROJECT_DIR$/src/target'
    ],
    projectPane         : projectPane
  };
}
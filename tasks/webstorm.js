'use strict';

function setUpWebstormTask(tyRun) {
  var fs              = require('fs'),
      path            = require('path'),
      defaults        = require('../lib/config/defaults'),
      platform        = require('../lib/config/platform');

  var config = defaults.getInstance('webstorm')
    .file(platform.userHomeDirectory(), '.angularity')
    .defaults({
      'subdir'   : undefined,
      'project'  : true,
      'tools'    : true,
      'rules'    : true,
      'templates': true,
      'launch'   : true
    });

  var webstormOptionDefinitions = [
    {
      key: 'defaults',
      value: {
        describe: 'Set defaults',
        alias   : 'z',
        boolean : true,
        isOptional: true
      }
    },
    {
      key: 'subdir',
      value: {
        describe: 'Navigate to the sub-directory specified',
        alias   : 's',
        string  : true,
        isOptional: true,
        default : config.get('subdir')
      }
    },
    {
      key: 'project',
      value: {
        describe: 'Setup project (.idea folder)',
        alias   : 'p',
        boolean : true,
        default : config.get('project')
      }
    },
    {
      key: 'tools',
      value: {
        describe: 'Install external tools',
        alias   : 't',
        boolean : true,
        default : config.get('tools')
      }
    },
    {
      key: 'rules',
      value: {
        describe: 'Set style rules',
        alias   : 'r',
        boolean : true,
        default : config.get('rules')
      }
    },
    {
      key: 'templates',
      value: {
        describe: 'Add code templates',
        alias   : 't',
        boolean : true,
        default : config.get('templates')
      }
    },
    {
      key: 'launch',
      value: {
        describe: 'Launch the IDE following setup',
        alias   : 'l',
        boolean : true,
        default : config.get('launch')
      }
    },
  ];

  function checkWebstormFlags(argv) {
    if (argv.help) {
      return true;
    }
    else {
      webstormOptionDefinitions.forEach(function(opt) {
        var key = opt.key;
        var value = argv[key];
        if (tyRun.checkFlagMissing(opt, key, value)) {
          return;
        }

        // ensure options correspond to the types that they were defined as belonging to
        tyRun.checkFlagType(opt, key, value);

        if (key === 'subdir') {
          var subdir  = path.resolve(value);
          var isValid = fs.existsSync(subdir) && fs.statSync(subdir).isDirectory();
          if (!isValid) {
            throw new Error('The specified subdirectory does not exist.');
          }
          if (!argv.defaults) {
            // when defaults are not present, check whether angularity project is present
            var projectPath = (value) ? path.join(value, 'angularity.json') : 'angularity.json';
            if (!fs.existsSync(path.resolve(projectPath))) {
              throw new Error('Current working directory (or specified subdir) is not a valid project. ' +
                'Try running the "init" command first.');
            }
          }
        }
      });
    }
    return true;
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
        if (!fs.existsSync(executablePath())) {
          throw new Error('Cannot find Webstorm executable, you will have to specify it explicitly.');
        } else {
          argv.launch = true;
          break;
        }
      default:
        if (!fs.existsSync(path.normalize(argv.launch))) {
          throw new Error('Launch path is not valid or does not exist.');
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
    return maximisePath(home, /^\.WebStorm\s*[.\d]+$/, 'config') ||         // windows|unix
      maximisePath(home, 'Library', 'Preferences', /^WebStorm\s*[.\d]+$/);  // darwin
  }

  /**
   * The user preferences directory for webstorm on the current platform
   * @returns {string}
   */
  function executablePath() {
    if (platform.isWindows()) {
      return path.join(maximisePath(
        reduceDirectories('C:/Program Files/JetBrains', 'C:/Program Files (x86)/JetBrains'),
        /^WebStorm\s*[.\d]+$/, 'bin'),
        'Webstorm.exe');
    } else if (platform.isMacOS()) {
      return '/Applications/WebStorm.app/Contents/MacOS/webide';
    } else if (platform.isUnix()) {
      if (fs.existsSync('/opt/webstorm/bin/webstorm.sh')) {
        return '/opt/webstorm/bin/webstorm.sh';
      }
      else if (fs.existsSync('/usr/local/bin/wstorm')) {
        return '/usr/local/bin/wstorm';
      }
      else {
        return null;
      }
    } else {
      return null;
    }
  }

  /**
   * Match the path defined by the path elements, where some may be RegExp.
   * Where there is more than one candidate choose the one with greatest interger component.
   * @param {...string|RegExp} elements Any number of path elements
   * @returns {string} A true concatentated path where found, else undefined
   */
  function maximisePath() {

    // rank a vs b based on any numeric component in their string
    function compare(a, b) {
      var numA = parseFloat(/[.\d]+/.exec(a)[0]);
      var numB = parseFloat(/[.\d]+/.exec(b)[0]);
      if        (isNaN(numA) || (numB > numA)) {
        return +1;
      } else if (isNaN(numB) || (numA > numB)) {
        return -1;
      } else {
        return 0;
      }
    }

    // ensure each element in the path exists
    // where it is a regex then match it and replace the element with a string
    var elements = Array.prototype.slice.call(arguments);
    for (var i = 1; i < elements.length; i++) {

      // the directory is elements 0 .. i-1 joined
      var directory = path.resolve(path.join.apply(path, elements.slice(0, i)));

      // no directory implies failure
      if (!fs.existsSync(directory)) {
        return null;
      }
      // regex element is matched
      else if ((typeof elements[i] !== 'string') && ('test' in elements[i])) {

        // find all matches, with the highest numeric index first
        var matches = fs.readdirSync(directory).filter(function eachDirectoryItem(item) {
            var resolved = path.resolve(path.join(directory, item));
            return elements[i].test(item) && fs.statSync(resolved).isDirectory();
          }).sort(compare);

        // no match implies failure, else use the item with the highest numeric index
        if (matches.length === 0) {
          return null;
        } else {
          elements[i] = matches[0];
        }
      }
      // anything else is cast to string
      else {
        elements[i] = String(elements[i]);
      }
    }

    // now join them all together
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

  var taskDefinition = {
    name: 'webstorm',
    description: [
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
    ].join('\n'),
    prerequisiteTasks: ['help'],
    checks: [validateLaunchPath, checkWebstormFlags],
    options: webstormOptionDefinitions,
    onInit: function onInitWebstormTask(yargsInstance) {
      console.log('onInitWebstormTask');

      var gulp            = require('gulp'),
          gutil           = require('gulp-util'),
          wordwrap        = require('wordwrap'),
          runSequence     = require('run-sequence'),
          childProcess    = require('child_process'),
          template        = require('lodash.template'),
          ideTemplate     = require('ide-template');

      var streams         = require('../lib/config/streams'),
          hr              = require('../lib/util/hr');

      var TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'webstorm');

      var cliArgs;

      gulp.task('webstorm', function (done) {
        console.log(hr('-', 80, 'webstorm'));

        yargsInstance
          .strict()
          .wrap(80);
        cliArgs = yargsInstance.argv;

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
          if (taskList.length > 1) {
            // length will be one because done callback is always appended to the task list
            runSequence.apply(runSequence, taskList);
          }
          else {
            console.log('Webstorm task run with all options turned off, so doing nothing');
          }
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
        var isValid       = fs.existsSync(destDirectory) && fs.statSync(destDirectory).isDirectory();
        if (!isValid) {
          gutil.log('Failed to locate Webstorm templates. Expected directory:')
          gutil.log('  ' + destDirectory)
        } else {
          var removed = [ ];
          var added   = [ ];
          fs.readdirSync(destDirectory).forEach(function eachTemplate(filename) {
              if (/^angularity/.test(path.basename(filename))) {
                removed.push(filename);
                fs.unlinkSync(path.join(destDirectory, filename));
              }
            });
          fs.readdirSync(srcDirectory).forEach(function eachTemplate(filename) {
              var srcPath = path.join(srcDirectory, filename);
              var destPath = path.join(destDirectory, filename);
              added.push(filename);
              fs.writeFileSync(destPath, fs.readFileSync(srcPath))
            });
          removed.forEach(function (filename) {
            var isRemove = (added.indexOf(filename) < 0);
            if (isRemove) {
              gutil.log('removed template ' + filename);
            }
          });
          added.forEach(function (filename) {
            gutil.log('wrote template ' + filename);
          });
        }
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
        var destDirectory = path.join(userPreferencesDirectory(), 'tools');
        var isValid       = fs.existsSync(destDirectory) && fs.statSync(destDirectory).isDirectory();
        if (!isValid) {
          gutil.log('Failed to locate Webstorm tools. Expected directory:')
          gutil.log('  ' + destDirectory)
        } else {
          var destPath = path.join(destDirectory, 'Angularity.xml');
          var content = ideTemplate.webStorm.createExternalTool({
            name : 'Angularity',
            tools: ['test', 'watch', 'watch --unminified', 'build', 'build --unminified', 'release'].map(createNode)
          });
          fs.writeFileSync(destPath, content);
        }
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
    },
    onRun: function onRunWebstormTask(yargsInstance) {
      console.log('onRunWebstormTask');
      var runSequence = require('run-sequence');
      runSequence(taskDefinition.name);
    }
  };

  tyRun.taskYargs.register(taskDefinition);
}

module.exports = setUpWebstormTask;

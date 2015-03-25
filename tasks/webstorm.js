'use strict';

function setUpWebStormTask(context) {
  if (!context.gulp) {
    throw new Error('Context must specify gulp instance');
  }
  if (!context.runSequence) {
    throw new Error('Context must specify run-sequence instance');
  }

  var fs          = require('fs'),
      path        = require('path'),
      ideTemplate = require('ide-template'),
      defaults    = require('../lib/config/defaults'),
      platform    = require('../lib/config/platform');

  var config = defaults
    .getInstance('webstorm')
    .file(platform.userHomeDirectory(), '.angularity')
    .defaults({
      'subdir'   : undefined,
      'project'  : true,
      'external' : true,
      'codestyle': true,
      'templates': true,
      'launch'   : true
    });

  var webstormOptionDefinitions = [
    {
      key: 'defaults',
      value: {
        describe  : 'Set defaults',
        alias     : 'z',
        isOptional: true,
        default   : false
      }
    },
    {
      key: 'subdir',
      value: {
        describe  : 'Navigate to the sub-directory specified',
        alias     : 's',
        string    : true,
        isOptional: true,
        default   : config.get('subdir')
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
      key: 'external',
      value: {
        describe: 'Install external tools to run Angularity',
        alias   : 'e',
        boolean : true,
        default : config.get('external')
      }
    },
    {
      key: 'codestyle',
      value: {
        describe: 'Install the Javascript code style',
        alias   : 'c',
        boolean : true,
        default : config.get('codestyle')
      }
    },
    {
      key: 'templates',
      value: {
        describe: 'Add code templates for AngularJs',
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
        default : config.get('launch')
      }
    }
  ];

  function checkWebstormFlags(argv) {
    var tyRun = context.taskYargsRun;

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
        if ((key !== 'defaults') && (key !== 'launch')) {
          tyRun.checkFlagType(opt, key, value);
        }

        if (key === 'subdir') {
          var subdir  = path.resolve(value);
          var isValid = fs.existsSync(subdir) && fs.statSync(subdir).isDirectory();
          if (!isValid) {
            throw new Error('The specified subdirectory does not exist.');
          }
        }
        else if (key === 'defaults') {
          if (!(/^(true|false|reset)$/.test(String(argv.defaults)))) {
            throw new Error('Unrecognised value for defaults flag, expected true|false|reset.');
          }
        }
        else if (key === 'launch') {
          switch (String(argv.launch)) {
            case 'false':
              break;
            case 'true':
              if (!ideTemplate.webStorm.validateExecutable()) {
                throw new Error('Cannot find Webstorm executable, you will have to specify it explicitly.');
              }
              break;
            default:
              var customPath = path.normalize(argv.launch);
              if (fs.existsSync(customPath)) {
                ideTemplate.webStorm.customExecutable = customPath;
              } else {
                throw new Error('Launch path is not valid or does not exist.');
              }
          }
        }
      });
      if (!argv.defaults) {
        // when defaults are not present, check whether angularity project is present
        var angularityProjectPresentErr = angularityProjectPresent(argv);
        if (angularityProjectPresentErr) {
          throw new Error(angularityProjectPresentErr);
        }
      }
    }
    return true;
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
      '',
      'Examples:',
      '',
      'angularity webstorm                              Run this task',
      'angularity webstorm --defaults -l <some-path>    Set a default executable path',
      'angularity webstorm --defaults reset             Reset defaults'
    ].join('\n'),
    prerequisiteTasks: ['help'],
    checks: [checkWebstormFlags],
    options: webstormOptionDefinitions,
    onInit: function onInitWebstormTask(yargsInstance) {
      var gulp            = context.gulp,
          gutil           = require('gulp-util'),
          runSequence     = require('run-sequence');

      var streams         = require('../lib/config/streams'),
          hr              = require('../lib/util/hr');

      var TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'webstorm');

      var cliArgs;
      yargsInstance
        .strict()
        .wrap(80);
      cliArgs = yargsInstance.argv;

      // launch parameter should be boolean for consistency with defaults
      cliArgs.launch = (cliArgs.launch === 'true') ? true : (cliArgs.launch === 'false') ? false : cliArgs.launch;

      gulp.task('webstorm', function (done) {
        console.log(hr('-', 80, 'webstorm'));

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
            cliArgs.subdir    && 'webstorm:subdir',
            cliArgs.project   && 'webstorm:project',
            cliArgs.external  && 'webstorm:externaltools',
            cliArgs.codestyle && 'webstorm:codestyle',
            cliArgs.templates && 'webstorm:templates',
            cliArgs.launch    && 'webstorm:launch'
          ].filter(Boolean);
          if (taskList.length > 0) {
            runSequence.apply(runSequence, taskList.concat(done));
          } else {
            done();
          }
        }
      });

      gulp.task('webstorm:subdir', function () {
        process.chdir(path.resolve(cliArgs.subdir));  // !! changing cwd !!
      });

      gulp.task('webstorm:project', function () {
        var properties = require(path.resolve('angularity.json'));

        var context = {
          projectName             : properties.name,
          jshintPath              : '$PROJECT_DIR$/.jshintrc',
          jsDebugPort             : properties.port,
          javascriptVersion       : 'ES6',
          watcherSuppressedTasks  : 'Traceur compiler;SCSS',
          JsKarmaPackageDirSetting: path.resolve(__dirname, '..', 'node_modules', 'karma'),
          contentPaths            : [
            {content: 'file://' + process.cwd()}
          ],
          libraries               : [
            'jasmine-DefinitelyTyped',
            'angular'
          ],
          selectedDebugName       : 'JavaScript Debug.' + properties.name,
          karmaDebugConfiguration : [
            {
              name      : properties.name,
              configFile: '$PROJECT_DIR$/' + streams.TEST + '/karma.conf.js',
              browsers  : 'Chrome',
              env       : [],
              tasks     : []
            }
          ],
          jsDebugConfiguration    : subdirectoriesWithFile(streams.APP, 'index.html')
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
          plainText               : [
            'file://$PROJECT_DIR$/app-build/index.css',
            'file://$PROJECT_DIR$/app-build/index.js',
            'file://$PROJECT_DIR$/app-test/index.js'
          ],
          resourceRoots           : [
            'file://$PROJECT_DIR$',
            'file://$PROJECT_DIR$/node_modules',
            'file://$PROJECT_DIR$/bower_components'
          ],
          projectView             : properties.name
        };

        ideTemplate.webStorm.createProject(process.cwd(), context);
      });

      gulp.task('webstorm:templates', function () {
        ideTemplate.webStorm.copyFileTemplates(path.join(TEMPLATE_PATH, 'fileTemplates'));
      });

      gulp.task('webstorm:externaltools', function () {
        ideTemplate.webStorm.createExternalTool({
          name : 'Angularity',
          tools: ['test', 'watch', 'watch --unminified', 'build', 'build --unminified', 'release']
            .map(createWebstormExternalToolContext)
        }, 'Angularity.xml');
      });

      gulp.task('webstorm:codestyle', function () {
        ideTemplate.webStorm.copyCodeStyle(path.join(TEMPLATE_PATH, 'Angularity.xml'), 'Angularity', process.cwd());
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
    },
    onRun: function onRunWebstormTask() {
      var gulp        = context.gulp;
      gulp.start(taskDefinition.name);
    }
  };

  return taskDefinition;

  /**
   * Validator function for an angularity project being present in the current working directory
   * @param {object} argv The yargs command line parameter set
   * @returns {string|undefined} Error message on failure
   */
  function angularityProjectPresent(argv) { // Todo @impaler move method to util location
    var projectPath = (argv.subdir) ? path.join(argv.subdir, 'angularity.json') : 'angularity.json';
    if (!fs.existsSync(path.resolve(projectPath))) {
      return 'Current working directory (or specified subdir) is not a valid angularity project.' +
        'Try running the "init" command first.';
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
}

module.exports = setUpWebStormTask;

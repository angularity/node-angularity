'use strict';

var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    wordwrap    = require('wordwrap'),
    runSequence = require('run-sequence'),
    path        = require('path'),
    fs          = require('fs'),
    template    = require('lodash.template'),
    merge       = require('lodash.merge');

var config  = require('../lib/config/config'),
    yargs   = require('../lib/util/yargs'),
    hr      = require('../lib/util/hr'),
    streams = require('../lib/config/streams');

var TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'angularity');
var IDE_LIST      = ['webstorm'];  // each of these needs to be a gulp-task in its own right

var cliArgs = yargs.resolveInstance;

var spaces = (new Array(30)).join(' ');
yargs.getInstance('init')
  .usage(wordwrap(2, 80)([
    'The "init" task initialises a blank project and optionally an IDE environment. The given options initialise ' +
    'project defaults. Where omitted the global default will be in effect for the project.',
    '',
    'The following steps are taken. Where a step is gated by a flag it is stated as "--flag [default value]".',
    '',
    '* project directory             exists, else create    --subdir [false]',
    '* /' + (streams.APP             + spaces).slice(0, 28) + ' exists, else create',
    '* /' + (streams.APP + '/*.html' + spaces).slice(0, 28) + ' exists, else create',
    '* /' + (streams.APP + '/*.scss' + spaces).slice(0, 28) + ' exists, else create',
    '* angularity.json               exists, else create',
    '* package.json, /node_modules   exists, else create    --npm [true]',
    '* bower.json, /bower_components exists, else create    --bower [true]',
    '* karma.conf.js                 exists, else create    --karma [true]',
    '* .jshintrc                     exists, else create    --jshint [true]',
    '* .gitignore                    exists, else create    --gitignore [true]',
    '* initialise and launch an IDE                         --ide ["none"]',
    '',
    'Notes:',
    '',
    '* No properties are set in existing files, delete existing files in order to change properties.',
    '* Both the npm and bower packages are initially set private which you will need to clear in order to publish.',
    '* Any given IDE is initialised per its task defaults. Use the task separately to review these options.'
  ].join('\n')))
  .example('$0 init -n todo -i webstorm', 'Create "todo" and initialise webstorm')
  .describe('h', 'This help message').alias('h', '?').alias('h', 'help')
  .describe('s', 'Create a sub-directory with project name').alias('s', 'subdir').default('s', false)
  .describe('n', 'The project name').alias('n', 'name').default('n', 'my-project')
  .describe('v', 'The project version').alias('v', 'version').string('v').default('v', '0.0.0')
  .describe('d', 'The project description').alias('d', 'description').default('d', '')
  .describe('t', 'A project tag').alias('t', 'tag')
  .describe('p', 'A port for the development web server').alias('p', 'port').default('p', 'random')
  .describe('npm', 'Create package.json').boolean('npm').default('npm', true)
  .describe('bower', 'Create bower.json').boolean('bower').default('bower', true)
  .describe('karma', 'Create karma.conf.js').boolean('karma').default('karma', true)
  .describe('jshint', 'Create .jshintrc').boolean('jshint').default('jshint', true)
  .describe('gitignore', 'Create .gitignore').boolean('gitignore').default('gitignore', true)
  .describe('ide', 'Initialise IDE ' + IDE_LIST.join('|')).boolean('ide').default('ide', 'none')
  .strict()
  .check(yargs.subCommandCheck)
  .check(needNameWhenSub)
  .check(validatePort)
  .wrap(80);

gulp.task('init', function (done) {
  console.log(hr('-', 80, 'init'));
  var ideList = []
    .concat(cliArgs().ide)   // yargs will supply multiple arguments if multiple flags are used
    .filter(function (ide) {
      return (IDE_LIST.indexOf(ide) >= 0);
    });
  var taskList = [
      cliArgs().subdir && 'init:subdir',
      'init:composition',
      'init:angularity',
      cliArgs().npm && 'init:npm',
      cliArgs().bower && 'init:bower',
      cliArgs().karma && 'init:karma',
      cliArgs().jshint && 'init:jshint',
      cliArgs().gitignore && 'init:gitignore'
    ]
    .concat(ideList)
    .filter(Boolean)
    .concat(done);
  runSequence.apply(runSequence, taskList);
});

/**
 * Create subdirectory with the project name
 */
gulp.task('init:subdir', function () {
  mkdirIfNotExisting(cliArgs().name);
  process.chdir(path.resolve(cliArgs().name));  // !! changing cwd !!
});

/**
 * Create \app and copy composition root files index.html|js|scss
 */
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
  writeTemplate('karma.conf.js');
});

gulp.task('init:jshint', function () {
  writeTemplate('.jshintrc');
});

gulp.task('init:gitignore', function () {
  writeTemplate('.gitignore');
});

function needNameWhenSub(argv) {
  if (argv.subdir && ((argv.name === true) || !(argv.name))) {
    throw new Error('Valid name must be given when using the subdirectory option.')
  }
}

function validatePort(argv) {
  if (argv.port && isNaN(parsInt(argv.port)) && (argv.port !== 'random')) {
    throw new Error('Port must be a valid integer or the keyword "random"');
  };
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

function writeTemplate(filename, subdir) {
  var srcAbsolute  = path.join(TEMPLATE_PATH, filename);
  var destRelative = path.join(subdir || '.', filename);
  var destAbsolute = path.resolve(destRelative);
  if (fs.existsSync(srcAbsolute) && !fs.existsSync(destAbsolute)) {

    // augment or adjust yargs parameters
    var port = (cliArgs().tag === 'random') ? (Math.random() * (65536 - 49152) + 49152) : port;
    var tags = []
      .concat(cliArgs().tag)   // yargs will convert multiple --tag flags to an array
      .filter(Boolean);
    var partial = fs.readFileSync(srcAbsolute).toString();
    var params  = merge(cliArgs(), {
      port : port,
      tags : JSON.stringify(tags)  // must stringify lists
    });

    // complete the template and write to file
    var merged  = template(partial, params);
    fs.writeFileSync(destAbsolute, merged);
    gutil.log('created file ' + destRelative);
  }
}
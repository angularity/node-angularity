'use strict';

var gulp        = require('gulp'),
    wordwrap    = require('wordwrap'),
    runSequence = require('run-sequence');

var config = require('../lib/config/config'),
    yargs  = require('../lib/util/yargs'),
    hr     = require('../lib/util/hr');

var IDE_LIST = ['webstorm'];  // each of these needs to be a gulp-task in its own right

var cliArgs = yargs.resolveInstance;

yargs.getInstance('init')
  .usage(wordwrap(2, 80)([
    'The "init" task initialises a blank project and optionally an IDE environment. The given options initialise ' +
    'project defaults. Where omitted the global default will be in effect for the project.',
    '',
    'The following steps are taken. Where a step is gated by a flag it is stated as "--flag [default value]".',
    '',
    '* project directory exists, else create                  --subdir [false]',
    '* /app              exists, else create',
    '* /app/*.html       exists, else create /app/index.html',
    '* /app/*.scss       exists, else create /app/index.scss',
    '* angularity.json   exists, else create',
    '* package.json      exists, else create                  --npm [true]',
    '* /node_modules     exists, else create                  --npm [true]',
    '* bower.json        exists, else create                  --bower [true]',
    '* /bower_components exists, else create                  --bower [true]',
    '* karma.conf.js     exists, else create                  --karma [true]',
    '* .jshintrc         exists, else create                  --jshint [true]',
    '* .gitignore        exists, else create                  --gitignore [true]',
    '* initialise and launch an IDE                           --ide ["none"]',
    '',
    'Notes:',
    '',
    '* Where project defaults are supplied, they overwrite any existing value in angularity.json.',
    '* Both the npm and bower packages are initially set private which you will need to clear in order to publish.',
    '* Any given IDE is initialised per its task defaults. Use the task separately to review these options.'
  ].join('\n')))
  .example('$0 init -n todo -i webstorm', 'Create "todo" and initialise webstorm')
  .describe('h', 'This help message').alias('h', '?').alias('h', 'help')
  .describe('s', 'Create a sub-directory with project name').alias('s', 'subdir').default('s', false)
  .describe('n', 'The project name').alias('n', 'name').default('n', 'my-project')
  .describe('v', 'The project version').alias('v', 'version').string('v').default('v', '0.0.0')
  .describe('w', 'Wrap console output at a given width').alias('w', 'wrap').default('w', 80)
  .describe('p', 'A port for the development web server').alias('p', 'port').default('p', 5555)
  .describe('npm', 'Create package.json').boolean('npm').default('npm', true)
  .describe('bower', 'Create bower.json').boolean('bower').default('bower', true)
  .describe('karma', 'Create karma.conf.js').boolean('karma').default('karma', true)
  .describe('jshint', 'Create .jshintrc').boolean('jshint').default('jshint', true)
  .describe('gitignore', 'Create .gitignore').boolean('gitignore').default('gitignore', true)
  .describe('ide', 'Initialise IDE ' + IDE_LIST.join('|')).boolean('ide').default('ide', 'none')
  .strict()
  .check(yargs.subCommandCheck)
  .wrap(80);

gulp.task('init', function (done) {
  console.log(hr('-', cliArgs().wrap, 'init'));
  var ideList = []
    .concat(cliArgs().ide)   // yargs will supply multiple arguments if multiple flags are used
    .filter(function (ide) {
      return (IDE_LIST.indexOf(ide) >= 0);
    });
  var taskList = [
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
  runSequence.apply(runSequence, tasks);
});

gulp.task('init:composition', function () {
});

gulp.task('init:angularity', function () {
});

gulp.task('init:npm', function () {
});

gulp.task('init:bower', function () {
});

gulp.task('init:karma', function () {
});

gulp.task('init:jshint', function () {
});

gulp.task('init:gitignore', function () {
});

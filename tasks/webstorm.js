'use strict';

var gulp        = require('gulp'),
    wordwrap    = require('wordwrap'),
    runSequence = require('run-sequence');

var config = require('../lib/config/config'),
    yargs  = require('../lib/util/yargs'),
    hr     = require('../lib/util/hr');

var cliArgs = yargs.resolveInstance;

yargs.getInstance('webstorm')
  .usage(wordwrap(2, 80)([
    'The "webstorm" task initialises webstorm for the current project and launches the IDE. Where the IDE is ' +
    'installed in a non-standard location the full path to the IDE should be used in place of the boolean in launch.',
    '',
    'The following steps are taken. Where a step is gated by a flag it is stated as "--flag [default value]".',
    '',
    '* Setup project (resources, launch, jshint, watchers..)  --project [true]',
    '* Create external tools that launch angularity           --tools [true]',
    '* Set coding style                                       --style [true]',
    '* Create external tools for angularity                   --tools [true]',
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
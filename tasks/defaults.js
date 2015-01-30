'use strict';

var gulp        = require('gulp'),
    wordwrap    = require('wordwrap'),
    runSequence = require('run-sequence');

var config = require('../lib/config/config'),
    yargs  = require('../lib/util/yargs'),
    hr     = require('../lib/util/hr');

yargs.getInstance('defaults')
  .usage(wordwrap(2, 80)('The "defaults" task writes global or project default settings. Use the keyword "remove" ' +
    'to delete a key from the defaults.'))
  .example('$0 defaults -p 8080', 'Set port 8080 in the project defaults')
  .example('$0 defaults -p remove', 'Clear port value in the project defaults')
  .example('$0 defaults -g -p 8080', 'Set port 8080 to global defaults')
  .describe('h', 'This help message').alias('h', '?').alias('h', 'help')
  .describe('g', 'Write global defaults not project').alias('g', 'global').boolean('g').default('g', false)
  .describe('p', 'A port for the development web server').alias('p', 'port')
  .describe('i', 'Full path to webstorm ide (where installed)').alias('i', 'intellij-path')
  .strict()
  .check(yargs.subCommandCheck)
  .wrap(80);
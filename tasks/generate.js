'use strict';

var gulp = require('gulp');
var argv = require('../bin/cli-args').argv;
var generator = require('../lib/generator/generator');

gulp.task('generate', [], function() {
  generator.util.generateProject(argv.name);
});

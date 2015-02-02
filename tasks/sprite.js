'use strict';

var path = require('path');

var gulp = require('gulp');
var gulpIf = require('gulp-if');
var gulpNewer = require('gulp-newer');
var cssSprite = require('css-sprite');
var through = require('through2');
var projectOfFile = require('project-of-file');

var configStreams = require('../lib/config/streams');

gulp.task('identifysprites', [], function() {

});

var projectOfFileInstance = projectOfFile.cachedInstance('angularity-sprite', process.cwd());

gulp.task('sprite', [], function() {
  return configStreams.imageApp()
    // .pipe(gulpNewer(configStreams.BUILD + '/sprite/_sprite.scss'))
    .pipe(through.obj(function(file, encoding, done) {
      var stream = this;
      //Prefix the file name of all images with the project name so as to create
      //disambiguation between sprites from mutliple dependencies.
      //The need to manipulate file names is inherent from the spriting library
      //using file names to generate CSS classes for each sprite.
      var projectName = projectOfFileInstance.name(file.path);
      file.path = path.join(
          process.cwd(), 'sprite', projectName + '--' + path.basename(file.path));
      stream.push(file);
      done(/*err*/);
    }))
    .on('data', function(file) {
    })
    .on('end', function() {
    })
    .pipe(
      cssSprite.stream({
        name: 'sprite',
        style: '_sprite.scss',
        processor: 'scss',
        cssPath: configStreams.BUILD + '/sprite/',
        // "generate both retina and standard sprites. src images have to be in retina resolution"
        retina: true,
        orientation: 'binary-tree',
      })
    )
    .pipe(gulp.dest(configStreams.BUILD + '/sprite/'));
});

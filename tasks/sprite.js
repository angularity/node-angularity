'use strict';
console.log('__dirname', __dirname);

var path = require('path');

var gulp = require('gulp');
var gulpIf = require('gulp-if');
var gulpNewer = require('gulp-newer');
var cssSprite = require('css-sprite');
var through = require('through2');
var projectOfFile = require('project-of-file');

var configStreams = require('../lib/config/streams');

var projectOfFileInstance = projectOfFile.cachedInstance('angularity-sprite', process.cwd());

gulp.task('idsprite', [], function() {
  var list = {}
  return configStreams.imageHtmlApp()
    .pipe(through.obj(function(file, encoding, done) {
      if (!file || !file.path || !file.isBuffer()) {
        throw 'Files must be buffers';
      }
      var contents = file.contents.toString();
      var regex = /\<i\s[^\>]*class\=[\"\']sprite-[\w-]+--[\w-]+[\"\'][^\>]*\>/gim ;
      var matches = contents.match(regex);
      if (matches && matches.length > 0) {
        matches = matches.map(function(tag) {
          var info = (tag).match( /\<i\s[^\>]*class\=[\"\']sprite-([\w-]+)--([\w-]+)[\"\'][^\>]*\>/im );
          return {
            lib: info[1],
            img: info[2],
          };
        })
      }
      else {
        matches = [];
      }
      list[file.path] = matches;
      done();
    }))
    .on('end', function() {
      console.log('list', list);
    });
});

gulp.task('sprite', [], function() {
  return configStreams.imageApp()
    // .pipe(/*browserify get list of classes*/)
    // .pipe(/*through to filter list of files based on stuff*/)
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
        template: path.join(__dirname, 'sprites.scss.mustache'),
      })
    )
    .pipe(gulp.dest(configStreams.BUILD + '/sprite/'));
});

'use strict';

var path = require('path');

var gulp = require('gulp');
var cssSprite = require('css-sprite');
var through = require('through2');
var projectOfFile = require('project-of-file');

var configStreams = require('../lib/config/streams');

var projectOfFileInstance = projectOfFile.cachedInstance('angularity-sprite', process.cwd());

gulp.task('sprite', [], function() {
  var list = {};

  return configStreams.imageHtmlApp()
    .pipe(through.obj(function transformFn(file, encoding, done) {
      if (!file || !file.path || !file.isBuffer()) {
        throw 'Files must be buffers';
      }

      //using regular expressions, identify possible sprite image file names,
      //and the projects which they should belong to
      //TODO investigate if a token-based parser would be a more apt solution
      var contents = file.contents.toString();
      var match, matches = [];
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
      matches.forEach(function(match) {
        var lib = list[match.lib];
        if (!lib) {
          lib = {};
        }
        lib[match.img] = true;
        list[match.lib] = lib;
      });
      done();
    },
    function flushFn(done) {
      var stream = this;
      //create a very specific set of glob strings based on project and image names
      //NOTE that should there be an overlap (e.g. when there are multiple dependencies with the same name)
      //the behaviour is indeterminate
      var mainGlob = [];
      for (var libName in list) {
        if (list.hasOwnProperty(libName)) {
          var lib = list[libName];
          for (var imgName in lib) {
            if (lib.hasOwnProperty(imgName)) {
              mainGlob.push('**/'+imgName+'.png');
            }
          }
        }
      }

      //Use the specific glob to create a "child" gulp stream
      //`stream` is referenced by means of closure is the parents gulp stream
      //into which the matched image files are pushed.
      //In addition, some of the filtering is defered to here,
      //because gulp.src only accepts globs,
      //but we need an custom filter function -
      //so gulp.src is run with {read:false} option first,
      //then subsequently a much more specific glob is constructed,
      //and gulp.src with {read:true} option is run
      var selectedImageFiles = [];
      configStreams.imageApp({ read: false }, mainGlob)
        .on('data', function(file) {
          //Prefix the file name of all images with the project name so as to create
          //disambiguation between sprites from mutliple dependencies.
          //The need to manipulate file names is inherent from the spriting library
          //using file names to generate CSS classes for each sprite.
          var imageProjectName = projectOfFileInstance.name(file.path);
          var imageName = path.basename(file.path, '.png');
          if (list[imageProjectName] && list[imageProjectName][imageName])
          {
            selectedImageFiles.push(file);
          }
        })
        .on('end', function() {
          var filteredGlob = selectedImageFiles.map(function(file) {
            return path.relative(file.base, file.path);
          });
          configStreams.imageApp(undefined, filteredGlob)
            .on('data', function(file) {
              var imageProjectName = projectOfFileInstance.name(file.path);
              file.base = process.cwd();
              file.path = path.join(
                  process.cwd(), 'sprite', imageProjectName + '--' + path.basename(file.path));
              stream.push(file);
            })
            .on('end', function() {
              done();
            })
        });
    }))
    .pipe(
      //finally invoke the actual spriting mechanism
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

'use strict';

var path = require('path');

var gulp = require('gulp');
var gulpIf = require('gulp-if');
var gulpNewer = require('gulp-newer');
var cssSprite = require('css-sprite');
var through = require('through2');
var projectOfFile = require('project-of-file');

var configStreams = require('../lib/config/streams');

var projectOfFileInstance = projectOfFile.cachedInstance('angularity-sprite', process.cwd());

/*
 * using regular expressions, identify possible sprite image file names,
 * and the projects which they should belong to
 * TODO investigate if a token-based parser would be a more apt solution
 */
function identifySpritesInHtmlFile(list, file) {
  var contents = file.contents.toString();
  var match, matches = [];
  var regex = /\<i\s[^\>]*class\=[\"\']sprite\ssprite-[\w-]+--[\w-]+[\"\'][^\>]*\>/gim ;
  var matches = contents.match(regex);
  if (matches && matches.length > 0) {
    matches = matches.map(function(tag) {
      var info = (tag).match( /\<i\s[^\>]*class\=[\"\']sprite\ssprite-([\w-]+)--([\w-]+)[\"\'][^\>]*\>/im );
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
}

/*
 * create a very specific set of glob strings based on project and image names
 * NOTE that should there be an overlap (e.g. when there are multiple dependencies with the same name)
 * the behaviour is indeterminate
 */
function constructFirstPassGlob(list, mainGlob) {
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
  return mainGlob;
}

/*
 * Prefix the file name of all images with the project name so as to create
 * disambiguation between sprites from mutliple dependencies.
 * The need to manipulate file names is inherent from the spriting library
 * using file names to generate CSS classes for each sprite.
 */
function filterSecondPassFiles(selectedImageFiles, list, file) {
  var imageProjectName = projectOfFileInstance.name(file.path);
  var imageName = path.basename(file.path, '.png');
  if (list[imageProjectName] && list[imageProjectName][imageName])
  {
    selectedImageFiles.push(file);
  }
}

function constructSecondPassGlob(selectedImageFiles) {
  return selectedImageFiles.map(function(file) {
    return path.relative(file.base, file.path);
  });
}

function renameFileToMatchSpriteName(file) {
  var imageProjectName = projectOfFileInstance.name(file.path);
  file.base = process.cwd();
  file.path = path.join(
    process.cwd(), 'sprite', imageProjectName + '--' + path.basename(file.path));
}

function htmlToSpriteImages() {
  var list = {};
  function transformFn(file, encoding, done) {
    if (!file || !file.path || !file.isBuffer()) {
      throw 'Files must be buffers';
    }
    identifySpritesInHtmlFile(list, file);
    done();
  }

  /*
   * Use the specific glob to create a "child" gulp stream
   * `stream` is referenced by means of closure is the parents gulp stream
   * into which the matched image files are pushed.
   * In addition, some of the filtering is defered to here,
   * because gulp.src only accepts globs,
   * but we need an custom filter function -
   * so gulp.src is run with {read:false} option first,
   * then subsequently a much more specific glob is constructed,
   * and gulp.src with {read:true} option is run
   */
  function flushFn(done) {
    var stream = this;
    var mainGlob = [];
    constructFirstPassGlob(list, mainGlob);

    var selectedImageFiles = [];
    configStreams.imageApp({ read: false }, mainGlob)
      .on('data', function(file) {
        filterSecondPassFiles(selectedImageFiles, list, file);
      })
      .on('end', function() {
        var filteredGlob = constructSecondPassGlob(selectedImageFiles);
        configStreams.imageApp(undefined, filteredGlob)
          .on('data', function(file) {
            renameFileToMatchSpriteName(file);
            stream.push(file);
          })
          .on('end', function() {
            done();
          })
      });
  }
  return through.obj(transformFn, flushFn);
}

gulp.task('sprite', [], function() {
  return configStreams.imageHtmlApp()
    .pipe(htmlToSpriteImages())
    .pipe(gulpNewer(configStreams.APP + '/sprite/_sprite.scss'))
    .pipe(cssSprite.stream({
        name: 'sprite',
        style: '_sprite.scss',
        processor: 'scss',
        cssPath: 'sprite',
        // "generate both retina and standard sprites. src images have to be in retina resolution"
        retina: true,
        orientation: 'binary-tree',
        template: path.join(__dirname, 'sprites.scss.mustache'),
        prefix: 'sprite',
      }))
    .pipe(
      gulpIf('*.scss',
        gulp.dest(configStreams.APP + '/sprite/'),
        gulp.dest(configStreams.BUILD + '/sprite/'))
    );
});

'use strict';

var path          = require('path');

var gulp          = require('gulp');
var concat        = require('gulp-concat');
var filter        = require('gulp-filter');
var inject        = require('gulp-inject');
var jshint        = require('gulp-jshint');
var minifyHtml    = require('gulp-minify-html');
var ngHtml2js     = require('gulp-ng-html2js');
var plumber       = require('gulp-plumber');
var rimraf        = require('gulp-rimraf');
var sassAlt       = require('gulp-sass-alt');
var semiflat      = require('gulp-semiflat');
var slash         = require('gulp-slash');
var traceurOut    = require('gulp-traceur-out');
var watch         = require('gulp-watch');
var watchSequence = require('gulp-watch-sequence');

var bowerFiles    = require('bower-files');
var browserSync   = require('browser-sync');
var combined      = require('combined-stream');
var runSequence   = require('run-sequence');
var bourbon       = require('node-bourbon');

var project       = require('./package.json');

var HTTP_PORT     = 8000;
var CONSOLE_WIDTH = 80;

var TEMP          = '.build';
var BOWER         = 'bower_components';

var JS_LIB_BOWER  = 'bower_components/**/js-lib';
var JS_LIB_LOCAL  = 'src/js-lib';
var JS_SRC        = 'src/target';
var JS_BUILD      = 'build';

var CSS_LIB_BOWER = 'bower_components/**/css-lib';
var CSS_LIB_LOCAL = 'src/css-lib';
var CSS_SRC       = 'src/target';
var CSS_BUILD     = 'build';

var HTML_SRC      = 'src/target';
var HTML_BUILD    = 'build';
var PARTIALS_NAME = 'templates';

var RELEASE       = 'release';
var CDN_LIBS      = 'html-libraries';
var CDN_APPS      = project.name;
var RELEASE_LIBS  = RELEASE + '/' + CDN_LIBS;
var RELEASE_APPS  = RELEASE + '/' + CDN_APPS;

var traceur;
var sass;
var bower;
var uglify;

// TODO move to node package
function bowerDepsVersioned() {
  var path = require('path');
  var through = require('through2');
  var bowerPackages = require('./bower.json').dependencies;
  var files         = [ ];
  var map           = { };
  for(var key in bowerPackages) {
    var bowerPath   = BOWER + '/' + key + '/';
    var packageJSON = require('./' + bowerPath + 'bower.json');
    [ ].concat(packageJSON.main).forEach(function(value) {
      var relative = path.normalize(bowerPath + value);
      var absolute = path.resolve(relative);
      files.push(relative);
      map[absolute] = '/' + path.join(key, packageJSON.version, value);
    });
  }
  return {
    src: function(opts) {
      return gulp.src(files, opts)
        .pipe(semiflat(process.cwd()));
    },
    version: function() {
      return through.obj(function(file, encoding, done) {
        file.base = process.cwd();
        file.path = file.base + map[file.path];
        done(null, file);
      });
    }
  };
}

// TODO move to node package
function versionDirectory() {
  var fs = require('fs');
  var crypto = require('crypto');
  var through = require('through2');
  var baseDirectory;
  var hash = crypto.createHash('md5');
  return through.obj(function(file, encoding, done) {
    var fileBase = path.resolve(file.base);
    var error;
    baseDirectory = baseDirectory || fileBase;
    if (fileBase !== baseDirectory) {
      error = new Error('base path must be the same in all files');
    } else if (file.isBuffer()) {
      hash.update(file.relative);
      hash.update(file.contents);
    } else {
      hash.update(file.relative);
    }
    done(error, file);
  }, function(done) {
    fs.rename(RELEASE_APPS, RELEASE_APPS + '-' + hash.digest('hex'), done);
  });
}

// TODO move to node package
function uglify2() {
  var through = require('through2');
  var uglify = require('uglify-js');
  var gutil  = require('gulp-util');
  var reserved = [ ];
  return {
    reserve: function() {
      return through.obj(function(file, encoding, done) {
        var regexp  = /\/\*{2}[^]*@ngInject[^\/]*\*\/\n+.*\w+\s*\(\s*(.*)\s*\)\s*\{/gm;
        var text    = file.contents.toString();
        var pending = [ ];
        var analysis;
        do {
          analysis = regexp.exec(text);
          if (analysis) {
            pending = pending.concat(analysis[1].split(/\s*,\s*/));
          }
        } while(analysis);
// TODO better logging
if (pending.length) {
console.log(file.relative, '\n@ngInject:', pending);
}
        reserved = reserved.concat(pending);
        done(null, file);
      });
    },
    minify: function() {
      return through.obj(function(file, encoding, done) {
        var options = {
          fromString: true,
          mangle: {
            except: reserved.join(',')
          }
        };
        var output = uglify.minify(file.contents.toString(), options);
        this.push(new gutil.File({
          path:     file.path,
          base:     file.base,
          cwd:      file.cwd,
          contents: new Buffer(output.code)
        }));
        done();
      });
    }
  };
}

function jsLibStream(opts) {
  return combined.create()
    .append(gulp.src(JS_LIB_BOWER + '/**/*.js', opts)                       // bower lib JS
      .pipe(semiflat(JS_LIB_BOWER)))
    .append(gulp.src([ JS_LIB_LOCAL + '/**/*.js', '!**/*.spec.js' ], opts)  // local lib JS overwrites
      .pipe(semiflat(JS_LIB_LOCAL)));
}

function jsSrcStream(opts) {
  return gulp.src(JS_SRC + '/**/*.js', opts)              // local app JS
    .pipe(semiflat(JS_SRC));
}

function jsSpecStream(opts) {
  return gulp.src(JS_LIB_LOCAL + '/**/*.spec.js', opts)   // local lib SPEC JS
    .pipe(semiflat(JS_LIB_LOCAL));
}

function cssLibStream(opts) {
  return combined.create()
    .append(gulp.src(CSS_LIB_BOWER + '/**/*.scss', opts)            // bower lib CSS
      .pipe(semiflat(CSS_LIB_BOWER)))
    .append(gulp.src(CSS_LIB_LOCAL + '/**/*.scss', opts)            // local lib CSS overwrites
      .pipe(semiflat(CSS_LIB_LOCAL)))
    .append(gulp.src(BOWER + '/**/bootstrap/bootstrap.scss', opts)  // bower bootstrap SASS
      .pipe(semiflat(BOWER + '/**/bootstrap')));
}

function cssSrcStream(opts) {
  return gulp.src(CSS_SRC + '/**/*.scss', opts)  // local app CSS
    .pipe(semiflat(CSS_SRC));
}

function htmlPartialsSrcStream(opts) {
  return gulp.src(HTML_SRC + '/**/partials/**/*.html', opts)
    .pipe(semiflat(HTML_SRC));
}

function htmlAppSrcStream(opts) {
  return gulp.src([ HTML_SRC + '/**/*.html', '!**/partials/**/*' ], opts) // ignore partials
    .pipe(semiflat(HTML_SRC));
}

function releaseLibStream(opts) {
  return gulp.src(RELEASE_LIBS + '/**/*', opts)
    .pipe(semiflat(RELEASE));
}

function routes() {
  var result = { };
  [ JS_LIB_LOCAL, CSS_LIB_LOCAL, BOWER, JS_BUILD, CSS_BUILD ].forEach(function(path) {
    result['/' + path] = path;
  });
  return result;
}

// DEFAULT ---------------------------------
gulp.task('default', [ 'watch' ]);

gulp.task('build', function(done) {
  console.log(hr('-', CONSOLE_WIDTH, 'build'));
  runSequence('js', 'css', 'html', done);
});

function hr(char, length, title) {
  var text = (title) ? (' ' + title.split('').join(' ').toUpperCase() + ' ') : '';  // double spaced title text
  while (text.length < length) {
    text = char + text + char;  // centre title between the given character
  }
  return text.slice(0, length); // enforce length, left justified
}

// SERVER ---------------------------------
gulp.task('server', [ 'build' ], function() {
  console.log(hr('-', CONSOLE_WIDTH, 'server'));
  browserSync({
    server: {
      baseDir: HTML_BUILD,
      routes:  routes()
    },
    port:     HTTP_PORT,
    logLevel: 'silent',
    open:     false
  });
});

gulp.task('reload', function() {
  console.log(hr('-', CONSOLE_WIDTH, 'reload'));
  browserSync.reload();
});

// JS ---------------------------------
gulp.task('js', function(done) {
  console.log(hr('-', CONSOLE_WIDTH, 'javascript'));
  runSequence(
    [ 'js:clean', 'tmp:clean' ],
    'js:init',
    'js:build',
    'tmp:clean',
    done
  );
});

gulp.task('test', function(done) {
  console.log(hr('-', CONSOLE_WIDTH, 'test'));
  runSequence(
    'tmp:clean',
    'js:init',
    'js:unit',
    'tmp:clean',
    done
  );
});

// clean the temp directory
gulp.task('tmp:clean', function() {
  return gulp.src(TEMP, { read: false })
    .pipe(rimraf());
});

// clean the js build directory
gulp.task('js:clean', function() {
  return gulp.src([ JS_BUILD + '/**/*.js*', '!**/*.*.js' ], { read: false })
    .pipe(rimraf());
});

// init traceur libs and run linter
gulp.task('js:init', function() {
  traceur = traceurOut(TEMP);
  return combined.create()
    .append(jsLibStream()
      .pipe(traceur.libraries()))
    .append(jsSrcStream()
      .pipe(traceur.sources()))
    .append(jsSpecStream()
      .pipe(traceur.sources()))
    .pipe(jshint())
    .pipe(traceur.jsHintReporter(CONSOLE_WIDTH));
});

// karma unit tests on local library only
gulp.task('js:unit', function() {
  return gulp.src(JS_LIB_LOCAL + '/**/*.spec.js')
    .pipe(traceur.concatJasmine({
      '@': function (file) { return file.path + ':0:0'; }
    }))
    .pipe(gulp.dest(TEMP))
    .pipe(traceur.transpile())
    .pipe(traceur.traceurReporter(CONSOLE_WIDTH))
    .pipe(traceur.karma({
      files:      bowerFiles({ dev: true }).js,
      frameworks: [ 'jasmine' ],
      reporters:  [ 'spec' ],
      browsers:   [ 'Chrome' ],
      logLevel:   'error'
    }, CONSOLE_WIDTH));
});

// resolve all imports for the source files to give a single optimised js file
//  in the build directory with source map for each
gulp.task('js:build', function() {
  return jsSrcStream({ read: false })
    .pipe(traceur.transpile())
    .pipe(traceur.traceurReporter(CONSOLE_WIDTH))
    .pipe(traceur.adjustSourceMaps())
    .pipe(gulp.dest(JS_BUILD));
});

// CSS ---------------------------------
gulp.task('css', function(done) {
  console.log(hr('-', CONSOLE_WIDTH, 'css'));
  runSequence(
    [ 'css:clean', 'css:init' ],
    'css:build',
    done
  );
});

// clean the css build directory
gulp.task('css:clean', function() {
  return gulp.src(CSS_BUILD + '/**/*.css*', { read: false })
    .pipe(rimraf());
});

// discover css libs
gulp.task('css:init', function() {
  sass = sassAlt();
  return cssLibStream({ read: false })
    .pipe(sass.libraries(bourbon.includePaths));
});

// compile sass with the previously discovered lib paths
gulp.task('css:build', function() {
  return cssSrcStream({ read: false })
    .pipe(sass.transpile())
    .pipe(sass.sassReporter(CONSOLE_WIDTH))
    .pipe(gulp.dest(CSS_BUILD));
});

// HTML ---------------------------------
gulp.task('html', function(done) {
  console.log(hr('-', CONSOLE_WIDTH, 'html'));
  runSequence(
    'html:clean',
    'html:partials',
    'html:inject',
    done
  );
});

// clean the html build directory
gulp.task('html:clean', function() {
  return gulp.src(HTML_BUILD + '/**/*.html*', { read: false })
    .pipe(rimraf());
});

// convert partials into template js
gulp.task('html:partials', function() {
  return htmlPartialsSrcStream()
    .pipe(plumber())
    .pipe(minifyHtml({
      empty:  true,
      spare:  true,
      quotes: true
    }))
    .pipe(ngHtml2js({
      moduleName: PARTIALS_NAME
    }))
    .pipe(concat(PARTIALS_NAME + '.html.js'))
    .pipe(gulp.dest(JS_BUILD));
});

// inject dependencies into html and output to build directory
gulp.task('html:inject', function() {
  bower = bowerDepsVersioned();
  return htmlAppSrcStream()
    .pipe(plumber())
    .pipe(traceur.injectAppJS(JS_BUILD))
    .pipe(sass.injectAppCSS(CSS_BUILD))
    .pipe(inject(bower.src({ read: false }), {
      name: 'bower'
    }))
    .pipe(gulp.dest(HTML_BUILD));
});

// RELEASE ---------------------------------
gulp.task('release', [ 'build' ], function(done) {
  console.log(hr('-', CONSOLE_WIDTH, 'release'));
  runSequence(
    'release:clean',
    'release:init',
    [ 'release:js', 'release:css', 'release:html', 'release:bower' ],
    'release:inject',
    'release:version',
    done
  );
});

// clean the html build directory
gulp.task('release:clean', function() {
  return gulp.src(RELEASE, { read: false })
    .pipe(rimraf());
});

gulp.task('release:init', function() {
  uglify = uglify2();
  return combined.create()
    .append(jsLibStream())
    .append(jsSrcStream())
    .pipe(uglify.reserve());
});

gulp.task('release:js', function() {
  return gulp.src([ JS_BUILD + '/**/*.js', '!**/dev/**' ])
    .pipe(uglify.minify())
    .pipe(gulp.dest(RELEASE_APPS));
});

gulp.task('release:css', function() {
  return gulp.src([ CSS_BUILD + '/**/*.css', '!**/dev/**' ])
    .pipe(gulp.dest(RELEASE_APPS));
});

gulp.task('release:html', function() {
  return gulp.src([ HTML_BUILD + '/**/*.html', '!**/dev/**' ])
    .pipe(gulp.dest(RELEASE_APPS));
});

// copy bower main elements to versioned directories in release
gulp.task('release:bower', function() {
  return bower.src()
    .pipe(bower.version())
    .pipe(gulp.dest(RELEASE_LIBS));
});

// inject dependencies into html and output to build directory
gulp.task('release:inject', function() {
  function relativeTransform(filepath, file, index, length, targetFile) {
    var relative = slash(path.relative(path.dirname(targetFile.path), file.path));
    switch(path.extname(relative)) {
      case '.css':
        return '<link rel="stylesheet" href="' + relative + '">';
      case '.js':
        return '<script src="' + relative + '"></script>';
    }
  }
  return gulp.src(RELEASE_APPS + '/**/*.html')
    .pipe(filter([ '**', '!**/dev/**' ]))
    .pipe(plumber())
    .pipe(traceur.injectAppJS(RELEASE_APPS, {
      name:      'inject',
      transform: relativeTransform
    }))
    .pipe(sass.injectAppCSS(RELEASE_APPS, {
      name:      'inject',
      transform: relativeTransform
    }))
    .pipe(inject(releaseLibStream({ read: false }), {
      name:      'bower',
      transform: relativeTransform
    }))
    .pipe(gulp.dest(RELEASE_APPS));
});

// rename app folder with the content MD5 hash
gulp.task('release:version', function() {
  return gulp.src(RELEASE_APPS + '/**')
    .pipe(versionDirectory());
});

// WATCH ---------------------------------
gulp.task('watch', [ 'server' ], function() {

  // enqueue actions to avoid multiple trigger
  var queue = watchSequence(500, function() {
    console.log(hr('\u2591', CONSOLE_WIDTH));
  });

  // watch statements
  watch({
    name: 'JS',
    emitOnGlob: false,
    glob: [
      JS_LIB_BOWER + '/**/*.js',
      JS_LIB_LOCAL + '/**/*.js',
      JS_SRC       + '/**/*.js'
    ]
  }, queue.getHandler('js', 'html', 'reload')); // html will be needed in case previous injection failed

  watch({
    name: 'CSS',
    emitOnGlob: false,
    glob: [
      CSS_LIB_BOWER + '/**/*.scss',
      CSS_LIB_LOCAL + '/**/*.scss',
      CSS_SRC       + '/**/*.scss'
    ]
  }, queue.getHandler('css', 'html', 'reload')); // html will be needed in case previous injection failed

  watch({
    name: 'HTML | BOWER',
    emitOnGlob: false,
    glob: [
      BOWER    + '/**/*',
      HTML_SRC + '/**/*.html'
    ]
  }, queue.getHandler('html', 'reload'));
});
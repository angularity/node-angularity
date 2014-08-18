var through = require('through2');
var uglify  = require('uglify-js');
var gutil   = require('gulp-util');

module.exports = function () {
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
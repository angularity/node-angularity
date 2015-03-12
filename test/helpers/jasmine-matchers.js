/* globals beforeEach, jasmine */
'use strict';

var path    = require('path'),
    fs      = require('fs'),
    merge   = require('lodash.merge'),
    isArray = require('lodash.isarray');

function toHaveFile() {
  return {
    compare: function compare(directory, filename) {
      var fullPath = path.resolve.apply(path, [].concat(directory).concat(filename));
      var pass     = fs.existsSync(fullPath) && !fs.statSync(fullPath).isDirectory();
      return {
        pass   : pass,
        message: 'file "' + filename + '" ' + (pass ? 'is' : 'is not') + ' present in directory ' + directory
      };
    }
  };
}

function toHaveDirectory() {
  return {
    compare: function compare(directory, subdirectory) {
      var fullPath = path.resolve.apply(path, [].concat(directory).concat(subdirectory));
      var pass     = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
      return {
        pass   : pass,
        message: ['sub-directory', quote(subdirectory), (pass ? 'is' : 'is not'), 'present in directory',
          quote(directory)].join(' ')
      };
    }
  };
}

function toBeEmptyDirectory() {
  return {
    compare: function compare(directory) {
      var fullPath = path.resolve.apply(path, [].concat(directory));
      var pass     = (fs.readdirSync(fullPath).length === 0);
      return {
        pass   : pass,
        message: ['directory', quote(directory), (pass ? 'is' : 'is not'), 'empty'].join(' ')
      };
    }
  };
}

function getHelpMatcher(description) {
  return function () {
    return {
      compare: function compare(buffer, expectError) {
        var text     = buffer.toString();
        var lastLine = text.split(/\n/g).filter(Boolean).pop();
        var hasError = /^\s*\[Error\:/.test(lastLine);
        var message =
          !(description.test(text)) ? 'Help description does not match expectation' :
          (hasError !== expectError) ? ['Help', (expectError ? 'expected' : 'did not expect'), 'an error',
            (expectError) ? ('saw ' + quote(lastLine)) : ''].join(' ') :
          '';
        return {
          pass   : !message,
          message: message || 'Help is as expected'
        };
      }
    };
  };
}

function getFileMatcher() {
  var files = Array.prototype.slice.call(arguments);
  return function () {
    return {
      compare: function compare(directories, exceptions) {
        var directory = path.join.apply(path, [].concat(directories));
        var message   = files
          .map(function(filename) {
            var isExpected = ([].concat(exceptions).indexOf(filename) < 0);
            var fullPath   = path.resolve.apply(path, [directory].concat(filename));
            var pass       = ((fs.existsSync(fullPath) && !fs.statSync(fullPath).isDirectory()) === isExpected);
            return !pass && ['file', quote(filename), (isExpected ? 'is not' : 'is'), 'present in directory',
                quote(directory)].join(' ');
          })
          .filter(Boolean)
          .join(', ');
        return {
          pass   : !message,
          message: message || 'All files are present'
        };
      }
    };
  };
}

function getFileFieldMatcher(file, field) {
  var files  = [].concat(file);
  var fields = [].concat(field);
  return function customMatcher() {
    return {
      compare: function compare(directory, required) {
        var requires = (fields.length > 1) ? required : [required]; // preserve required value which is an array
        var message  = files
          .map(function (basename) {
            var fullPath = path.resolve.apply(path, [].concat(directory).concat(basename));
            var json     = loadJSON(fullPath);
            return json && fields
              .map(function (field, i) {
                function test(value, j) {
                  var required = (arguments.length > 1) ? requires[i][j] : requires[i];
                  return (typeof required === 'string') ? (value === required) :
                    ('test' in required) ? required.test(value) :
                    false;
                }
                var value  = json[field];
                var isPass = (field in json) && (isArray(value) ? value.every(test) : test(value));
                return !isPass && ['file', quote(basename), 'field', quote(field), 'does not match',
                  JSON.stringify(requires[i]), 'saw', JSON.stringify(json[field])].join(' ');
              })
              .filter(Boolean)
              .join(', ');
          })
          .filter(Boolean)
          .join(', ');
        return {
          pass   : !message,
          message: message || ['files', files.map(quote).join(', '), 'all contain the required fields',
            fields.map(quote).join(', ')].join(' ')
        };
      }
    };
  };
}

function loadJSON(filepath) {
  var isExist = fs.existsSync(filepath) && !fs.statSync(filepath).isDirectory();
  var json    = null;
  if (isExist) {
    try {
      json = require(filepath);
    }
    catch (exception) {
      json = null;
    }
  }
  return json;
}

function quote(text) {
  return '"' + text + '"';
}

function addFileMatchers() {
  jasmine.addMatchers({
    toHaveFile        : toHaveFile,
    toHaveDirectory   : toHaveDirectory,
    toBeEmptyDirectory: toBeEmptyDirectory
  });
}

module.exports = {
  getHelpMatcher     : getHelpMatcher,
  getFileMatcher     : getFileMatcher,
  getFileFieldMatcher: getFileFieldMatcher,
  addFileMatchers    : addFileMatchers
};

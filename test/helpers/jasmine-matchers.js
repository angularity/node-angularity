/* globals beforeEach, jasmine */
'use strict';

var path = require('path'),
    fs   = require('fs');

function toHaveFile() {
  return {
    compare: function (actual, expected) {
      var fullPath = path.resolve(actual, expected);
      var pass     = fs.existsSync(fullPath) && !fs.statsSync(fullPath).isDirectory();
      return {
        pass   : pass,
        message: 'file ' + expected + ' ' + (pass ? 'is' : 'is not') + ' present in directory ' + actual
      };
    }
  };
}

function toHaveDirectory() {
  return {
    compare: function (actual, expected) {
      var fullPath = path.resolve(expected, actual);
      var pass     = fs.existsSync(fullPath) && fs.statsSync(fullPath).isDirectory();
      return {
        pass   : pass,
        message: 'sub-directory ' + expected + ' ' + (pass ? 'is' : 'is not') + ' present in directory ' + expected
      };
    }
  };
}

function toBeEmptyDirectory() {
  return {
    compare: function (actual) {
      var list = fs.readdirSync(path.resolve(actual));
      var pass = (list.length === 0);
      return {
        pass   : pass,
        message: 'directory ' + actual + ' ' + (pass ? 'is' : 'is not') + ' empty'
      };
    }
  };
}

module.exports = function() {
  jasmine.addMatchers({
    toHaveFile        : toHaveFile,
    toHaveDirectory   : toHaveDirectory,
    toBeEmptyDirectory: toBeEmptyDirectory
  });
};

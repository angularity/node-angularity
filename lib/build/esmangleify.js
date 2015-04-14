'use strict';

var merge    = require('lodash.merge'),
    esmangle = require('esmangle');

var esprimaTools = require('./browserify-esprima-tools');

/**
 * Esprima based minifier transform for Browserify.
 * @param {object} opt An options hash
 */
function esmangleify(opt) {

  // options is the escodegen format
  var format = merge({
    renumber   : true,
    hexadecimal: true,
    escapeless : true,
    compact    : true,
    semicolons : false,
    parentheses: false
  }, opt);

  // transform
  return esprimaTools.createTransform(updater, format);

  /**
   * The updater function for the esprima transform
   * @param {string} file The filename for the Browserify transform
   * @param {object} ast The esprima syntax tree
   * @returns {object} The mangled esprima syntax tree
   */
  function updater(file, ast) {
    return esmangle.mangle(ast);
  }
}

module.exports = esmangleify;

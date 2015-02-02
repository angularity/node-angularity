'use strict';

var fs    = require('fs'),
    path  = require('path'),
    merge = require('lodash.merge');

var instances = { };

/**
 * Retrieve a instance of the multiton for the given key
 * @param {string} key The key for the mulititon
 * @returns {{file: Function, defaults: Function, get: Function}}
 */
function getInstance(key) {
  return instances[key] = instances[key] || new Defaults(key);
}

/**
 * A single instance of the multiton
 * @constructor
 */
function Defaults(key) {
  this.key_      = key;
  this.file_     = null;
  this.defaults_ = { };
  this.values_   = null;
  this.file      = file.bind(this);
  this.defaults  = defaults.bind(this);
  this.get       = get.bind(this);
  this.set       = set.bind(this);
  this.commit    = commit.bind(this);
}

/**
 * Set the path of a file that will be used for persistence
 * @param {...string} Any number of path elements
 * @return {Defaults} the current instance
 */
function file() {
  var file = this.file_ = path.resolve(path.join.apply(path, arguments));
  if (file && fs.existsSync(file)) {
    try {
      var overall = readFile(file) || {};
      this.values_ = this.key_ ? overall[this.key_] : overall;
    } catch(error) {
      this.values  =  {};
    }
  }
  return this;
}

/**
 * Set defaults_ values for the key
 * @param {object} parameters a hash of default values
 * @return {Defaults} the current instance
 */
function defaults(parameters) {
  this.defaults_ = (typeof parameters === 'object') ? parameters : {};
  return this;
}

/**
 * Resolve the values of the given field
 * @param {string} field an field to retrieve the values for
 * @return {*} the resolved value of that field
 */
function get(field) {
  if (field) {
    return (this.values_ || {})[field] || this.defaults_[field];
  } else {
    return merge({ }, this.values_);
  }
}

/**
 * Set the configuration for any field that was supplied in the defaults() parameters
 * @param {object|string} objectOrField An enumerable object or a single field string
 * @param {*} value Where a filed is given this is a value to set, or 'reset' to clear
 * @return {Defaults} the current instance
 */
function set(objectOrField, value) {
  this.values_ = this.values_ || {};  // create values if no file present

  // field-value mode
  if ((typeof objectOrField === 'string') && (arguments.length > 1)) {
    if (objectOrField in this.defaults_) {
      if (value === this.defaults_[objectOrField]) {
        delete this.values_[objectOrField];
      } else {
        this.values_[objectOrField] = value;
      }
    }
  }

  // enumerable object mode
  else {
    for (var key in objectOrField) {
      this.set(key, objectOrField[key])
    }
  }

  // return self
  return this;
}

/**
 * Write any non-default values to a previously specified file
 * @return {string} the full path to the file that was written
 */
function commit() {
  var pending;
  if (this.key_) {
    pending = readFile(this.file_) || { };
    pending[this.key_] = this.values_;
  } else {
    pending = this.values_;
  }
  fs.writeFileSync(this.file_, JSON.stringify(pending, null, 2));
  return this.file_;
}

function readFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    var data = fs.readFileSync(filePath);
    try {
      return JSON.parse(data)
    } catch(error) {
      throw new Error('Unparsable json file: ' + filePath);
    }
  }
}

module.exports = {
  getInstance: getInstance
};
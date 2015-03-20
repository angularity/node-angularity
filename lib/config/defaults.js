'use strict';

var fs    = require('fs'),
    path  = require('path'),
    merge = require('lodash.merge');

var instances = { };

/**
 * Retrieve a instance of the multiton for the given key
 * @param {string} [key] The key for the multiton
 * @returns {{file: Function, defaults: Function, get: Function}}
 */
function getInstance(key) {
  var result = instances[key] = instances[key] || new Defaults(key);
  return result;
}

/**
 * A single instance of the multiton
 * @constructor
 */
function Defaults(key) {
  this.key_       = key;
  this.file_      = null;
  this.defaults_  = {};
  this.values_    = {};
  this.file       = file.bind(this);
  this.defaults   = defaults.bind(this);
  this.get        = get.bind(this);
  this.set        = set.bind(this);
  this.changeList = changeList.bind(this);
  this.revert     = revert.bind(this);
  this.commit     = commit.bind(this);
}

/**
 * Set the path of a file that will be used for persistence
 * @param {...string} Any number of path elements
 * @return {Defaults} the current instance
 */
function file() {
  /* jshint validthis:true */
  var filePath = this.file_ = path.resolve(path.join.apply(path, arguments));
  if (filePath && fs.existsSync(filePath)) {
    var existing = this.values_;
    this.values_ = readFile(filePath, this.key_) || {};
    this.set(existing);
  }
  return this;
}

/**
 * Set defaults_ values for the key
 * @param {object} parameters a hash of default values
 * @return {Defaults} the current instance
 */
function defaults(parameters) {
  /* jshint validthis:true */
  this.defaults_ = (typeof parameters === 'object') ? parameters : {};
  return this;
}

/**
 * Resolve the collection of values, or just the value of the given field
 * @param {string} [field] an optional field to retrieve the values for
 * @return {*} the resolved value of that field
 */
function get(field) {
  /* jshint validthis:true */
  if (field) {
    return (field in this.values_) ? this.values_[field] : this.defaults_[field];
  } else {
    return merge({}, this.defaults_, this.values_);
  }
}

/**
 * The list of fields that have been changed since last commit
 * @returns {Array.<string>} List of changed fields, possible empty
 */
function changeList() {
  /* jshint validthis:true */
  return Object.keys(this.values_);
}

/**
 * Set the configuration for any field that was supplied in the defaults() parameters
 * @param {object|string} objectOrField An enumerable object or a single field string
 * @param {*} value Where a filed is given this is a value to set, or 'reset' to clear
 * @return {Defaults} the current instance
 */
function set(objectOrField, value) {
  /* jshint validthis:true */

  // enumerable object mode
  if (typeof objectOrField === 'object') {
    for (var key in this.defaults_) {
      if (key in objectOrField) {
        this.set(key, objectOrField[key]);
      }
    }
  }

  // field-value mode
  else if ((typeof objectOrField === 'string') && (arguments.length > 1)) {
    if (objectOrField in this.defaults_) {
      if (value === this.defaults_[objectOrField]) {
        delete this.values_[objectOrField];
      } else {
        this.values_[objectOrField] = value;
      }
    }
  }

  // return self
  return this;
}

/**
 * Clear any overrides
 */
function revert() {
  /* jshint validthis:true */
  this.values_ = {};
  return this;
}

/**
 * Write any non-default values to a previously specified file
 * @return {string} the full path to the file that was written
 */
function commit() {
  /* jshint validthis:true */
  var pending;
  if (this.key_) {
    pending = readFile(this.file_) || {};
    pending[this.key_] = this.values_;
  } else {
    pending = this.values_;
  }
  fs.writeFileSync(this.file_, JSON.stringify(pending, null, 2));
  return this.file_;
}

/**
 * Safe file read
 * @param {string} filePath path to a file that may not exist
 * @param {string} [field] a field within the file to return
 * @returns {*} parsed file content
 */
function readFile(filePath, field) {
  if (filePath && fs.existsSync(filePath)) {
    var data = fs.readFileSync(filePath).toString();
    try {
      var json = JSON.parse(data);
      return field ? (json[field] || {}) : json;
    } catch(error) {
      throw new Error('Unparsable json file: ' + filePath);
    }
  }
}

module.exports = {
  getInstance: getInstance
};
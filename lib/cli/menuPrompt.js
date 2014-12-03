/**
 * Utility to more easily write the cli options through asks npm.
 *
 * See the usage in the initialiseMenu.js.
 */
'use strict';

var _        = require('lodash'),
    Q        = require('q'),
    asks     = require('asks');

var QuestionType = {
  INPUT: 'input',
  LIST : 'list'
};

var Menu = function () {
  this.questions = [];
};

Menu.prototype.askText = function (name, message, defaultValue, validate, filter) {
  this.addQuesitonType(name, message, null, defaultValue, validate, filter, QuestionType.INPUT);
};

Menu.prototype.askList = function (name, message, choices, defaultValue, validate, filter) {
  this.addQuesitonType(name, message, choices, defaultValue, validate, filter, QuestionType.LIST);
};

Menu.prototype.addQuesitonType = function(name, message, choices, defaultValue, validate, filter, type) {
  var question = {};
  question.name = name;
  question.choices = choices;
  question.message = message;
  question.default = defaultValue;
  question.type = type;
  question.filter = filter;
  question.validate = validate;

  this.questions.push(question);
};

Menu.prototype.run = function () {
  var deferred = Q.defer();

  asks.prompt(this.questions, function (result) {
    deferred.resolve(result);
  });

  return deferred.promise;
};

module.exports = Menu;
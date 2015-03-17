(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

/**
 * Hello World controller
 * @ngInject
 */
function helloWorld() {
  var vm = this;
  vm.message = "hello world";
}

module.exports = helloWorld;

},{}],2:[function(require,module,exports){
"use strict";

/* globals describe, beforeEach, inject, it, expect */

var helloWorld = require("./hello-world");

describe("hello-world example spec", function () {
  var controller;

  angular.module("hello-world-spec", []).controller("helloWorld", helloWorld);

  beforeEach(angular.mock.module("hello-world-spec"));

  beforeEach(inject(function ($controller) {
    controller = $controller("helloWorld");
  }));

  it("hello world controller", function () {
    expect(controller.message).toBe("hello world");
  });
});

},{"./hello-world":1}]},{},[2])
//# sourceMappingURL=index.js.map

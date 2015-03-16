(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

/* globals angular */

var appRoutes = require("../minimal/app-routes");
var helloWorldController = require("../hello-world/hello-world");

angular.module("browser-image-diff-client", ["ui.router"]).controller("helloWorld", helloWorldController).config(appRoutes);

},{"../hello-world/hello-world":2,"../minimal/app-routes":3}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
"use strict";

module.exports = function appRoutes($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.otherwise("/");
  $stateProvider.state("home", {
    url: "/",
    template: require("./app.html"),
    controller: "AppController"
  });
};

},{"./app.html":4}],4:[function(require,module,exports){
module.exports = "<h1>Minimal {{title}}</h1>";

},{}]},{},[1])
//# sourceMappingURL=index.js.map

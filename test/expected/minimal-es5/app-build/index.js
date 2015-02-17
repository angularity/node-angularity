(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";var r=require("___________________0");var e=require("_______________________1");angular.module("browser-image-diff-client",["ui.router"]).controller("AppController",e).config(r);
},{"_______________________1":3,"___________________0":4}],2:[function(require,module,exports){
module.exports="<h1>Minimal {{title}}</h1>";
},{}],3:[function(require,module,exports){
"use strict";module.exports=function(t){t.title="Hello World"};
},{}],4:[function(require,module,exports){
"use strict";module.exports=function(e,t){t.otherwise("/");e.state("home",{url:"/",template:require("_________2"),controller:"AppController"})};
},{"_________2":2}]},{},[1])


//# sourceMappingURL=index.js.map
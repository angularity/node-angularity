'use strict';

var appRoutes = require('../../js-lib/app/appRoutes');
var appController = require('../../js-lib/app/appController');

angular.module('app', ['ui.router'])
  .config(['$stateProvider', '$urlRouterProvider', appRoutes])
  .controller('appController', ['$scope', appController]);
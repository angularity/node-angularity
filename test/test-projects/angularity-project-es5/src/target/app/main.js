var appRoutes = require('../../js-lib/app/appRoutes');
var appController = require('../../js-lib/app/appController');

angular.module('app', ['templates', 'ui.router'])
  .config(['$stateProvider', '$urlRouterProvider', appRoutes])
  .controller('appController', ['$scope', appController]);
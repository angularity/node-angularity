/**
 * Routing for the app.
 * @ngInject
 * @param {object} $urlRouterProvider
 * @param $stateProvider
 */
function appRoutes($stateProvider, $urlRouterProvider) {
  'use strict';

  $urlRouterProvider.otherwise('/');
  $stateProvider
    .state('home', {
      url        : '/',
      templateUrl: 'partials/partial.html',
      controller : 'appController'
    });
}

module.exports = appRoutes;
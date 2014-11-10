/**
 * <p>Routing for the app.</p>
 * @ngInject
 * @param {object} $StateProvider
 * @param {object} $urlRouterProvider
 */
export default function appRoutes($stateProvider, $urlRouterProvider) {
  'use strict';
  $urlRouterProvider.otherwise('/');
  $stateProvider
    .state('home', {
      url:         '/',
      templateUrl: '/partials/partial.html',
      controller:  'AppController'
    });
}
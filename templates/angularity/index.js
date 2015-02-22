/* globals angular */

angular.module('<%= name %>', [ 'ui.router' ])
  .config(function deleteMe($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/');
    $stateProvider
      .state('home', {
        url:      '/',
        template: '<span>Hello World</span>'
      });
  });
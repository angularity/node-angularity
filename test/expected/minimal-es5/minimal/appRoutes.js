module.exports = function appRoutes($stateProvider, $urlRouterProvider) {
    'use strict';

    $urlRouterProvider.otherwise('/');
    $stateProvider
        .state('home', {
            url: '/',
            template: require('./app.html'),
            controller: 'AppController'
        });
};
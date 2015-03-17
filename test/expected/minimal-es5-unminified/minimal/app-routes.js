module.exports = function appRoutes($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/');
    $stateProvider
        .state('home', {
            url: '/',
            template: require('./app.html'),
            controller: 'AppController'
        });
};
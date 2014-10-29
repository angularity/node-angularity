(function () {
    'use strict';

    /**
     * <p>Routing for the app.</p>
     * @ngInject
     * @param {object} $urlRouterProvider
     * @param $stateProvider
     */
    function appRoutes($stateProvider, $urlRouterProvider) {

        $urlRouterProvider.otherwise('/');
        $stateProvider
            .state('home', {
                url: '/',
                templateUrl: '/partials/partial.html',
                controller: 'appController'
            });
    }

    module.exports = appRoutes;
}());
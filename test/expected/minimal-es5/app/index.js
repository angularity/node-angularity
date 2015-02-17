/* globals angular */

var appRoutes = require('../minimal/app-routes');
var appController = require('../minimal/app-controller');

angular.module('browser-image-diff-client', ['ui.router'])
    .controller('AppController', appController)
    .config(appRoutes);
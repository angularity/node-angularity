/* globals angular */

var appRoutes = require('../minimal/appRoutes');
var appController = require('../minimal/appController');

angular.module('browser-image-diff-client', ['ui.router'])
    .controller('AppController', appController)
    .config(appRoutes);
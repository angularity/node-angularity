/* globals angular */

var appRoutes = require('../minimal/app-routes');
var helloWorldController = require('../hello-world/hello-world');

angular.module('browser-image-diff-client', ['ui.router'])
    .controller('helloWorld', helloWorldController)
    .config(appRoutes);
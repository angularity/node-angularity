var uuid = require('node-uuid');

/**
 * @ngInject
 */
function appController($scope) {
  'use strict';
  $scope.title = 'Hello World controller';

  $(document.body).append('<h1>' + uuid.v4() + '</h1>');
}

module.exports = appController;
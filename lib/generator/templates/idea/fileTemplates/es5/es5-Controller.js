/**
 * ${NAME} Controller
 *
 * TODO description of this Controller
 *
 * @ngInject
 * Created by ${USER} on ${DATE}.
 */
function ${NAME}($scope) {
  'use strict';

  var something_ = 'Hello World';
  $scope.method = method;

  $scope.getSomething = function () {
    return something_;
  };

  $scope.setSomething = function (value) {
    something_ = value;
  };

  function method() {
    // TODO implement me
  }

}

module.exports = ${NAME};

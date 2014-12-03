/**
 * ${NAME} Controller
 *
 * TODO description of this Controller
 *
 * @ngInject
 * Created by ${USER} on ${DATE}.
 */
function ${NAME}(${DS}scope) {
  'use strict';

  var something_ = 'Hello World';
  ${DS}scope.method = method;

  ${DS}scope.getSomething = function () {
    return something_;
  };

  ${DS}scope.setSomething = function (value) {
    something_ = value;
  };

  function method() {
    // TODO implement me
  }

}

module.exports = ${NAME};

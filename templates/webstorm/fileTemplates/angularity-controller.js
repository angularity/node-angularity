/**
 * TODO description of this controller
 * @ngInject
 */
function $declaration(${DS}scope /*, TODO injectables.. */) {

  // initialisation
  var somePrivateVar = 'delete-me';

  // composition
  ${DS}scope.somePublicVar = 'delete-me';
  ${DS}scope.someMethod    = someHoistedMethod;

  /**
   * TODO description of this method per JSDoc
   */
  function someHoistedMethod() {
  }
}

module.exports = $declaration;
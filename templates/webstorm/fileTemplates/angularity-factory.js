/**
 * TODO description of this factory
 * @ngInject
 */
function $declaration(/* TODO inject */) {

  // initialisation
  var somePrivateVar = 'delete-me';

  // composition
  return {
    somePublicVar: 'delete-me',
    someMethod   : someHoistedMethod
  }

  /**
   * TODO description of this method per JSDoc
   */
  function someHoistedMethod() {
  }
}

module.exports = $declaration;
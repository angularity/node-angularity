/* globals module, describe, beforeEach, inject, it, expect, spyOn */

var $declaration_to_test = require('./$file_that_exports_declaration');

describe('$file_that_exports_declaration', function() {

  // variables
  var scope;
  /* TODO additional variables for each mock */

  // definition
  angular.module('$file_that_exports_declaration', [ ])
    .controller('$declaration_to_test', $declaration_to_test);

  // our temporary module
  beforeEach(angular.mock.module('$file_that_exports_declaration'));

  // mocks
  beforeEach(function() {
    /* TODO create mocks and assign them to variables */
  });

  // create the scope
  beforeEach(inject(function (${DS}rootScope, ${DS}controller /* TODO injectables.. */) {
    scope = ${DS}rootScope.${DS}new();
    ${DS}controller('$declaration_to_test', {
      '${DS}scope': scope
      /* TODO map mock objects here */
    });
  }));

  /* TODO jasmine description */

});
/* globals module, describe, beforeEach, inject, it, expect, spyOn */

var $declaration_to_test = require('./$file_that_exports_declaration');

describe('$file_that_exports_declaration', function() {

  // variables
  var sut;
  /* TODO additional variables for each mock */

  // mocks
  beforeEach(function() {
    /* TODO create mocks and assign them to variables */
  });

  // create the system under test
  beforeEach(inject(function (${DS}injector) {
    sut = ${DS}injector.invoke($declaration_to_test, undefined, {
      /* TODO assign mocks */
    });
  }));

  /* TODO jasmine description */

});
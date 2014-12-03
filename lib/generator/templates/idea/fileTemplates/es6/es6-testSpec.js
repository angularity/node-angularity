/* globals angular, module, describe, beforeEach, inject, it, expect, spyOn */

//import myDirective from 'directives/myDirective';

describe('@', function() {
  'use strict';

  var scope;

  // mappings
  angular.module('@', [ ]);
    // add your test target like the composition root
    //.directive('my-directive', myDirective);

  // our temporary module
  beforeEach(module('@'));

  beforeEach(inject(function(${DS}rootScope) {
    scope = ${DS}rootScope.${DS}new();
  }));

  beforeEach(inject(function(${DS}compile) {
    //var example = ${DS}compile('<my-directive><my-directive/>')(scope);
  }));

  it('should ....', function() {
    expect(/* todo */).toBe(/* todo */);
  });

});
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

  beforeEach(inject(function($rootScope) {
    scope = $rootScope.$new();
  }));

  beforeEach(inject(function($compile) {
    //var example = $compile('<my-directive><my-directive/>')(scope);
  }));

  it('should ....', function() {
    expect(/* todo */).toBe(/* todo */);
  });

});
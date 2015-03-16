/* globals describe, beforeEach, inject, it, expect */

var helloWorld = require('./hello-world');

describe('hello-world example spec', function () {
    var controller;

    angular.module('hello-world-spec', [])
        .controller('helloWorld', helloWorld);

    beforeEach(angular.mock.module('hello-world-spec'));

    beforeEach(inject(function ($controller) {
        controller = $controller('helloWorld');
    }));

    it('hello world controller', function(){
      expect(controller.message).toBe('hello world');
    });

});
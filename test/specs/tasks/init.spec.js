'use strict';

var fs   = require('fs'),
    path = require('path');

var angularityTest = require('../../helpers/cli-test')
  .create()
  .forProgram('angularity')
  .withDirectories('test/expected', 'test/temp')
  .seal();

describe('The Angularity init task initialises the minimum files needed for a project.', function () {

  it('should correctly initialise a project with a custom name.', function (done) {

    angularityTest.create()
      .addInvocation('init -n {name}')
      .addParameters({ name: 'todo' })
      .addParameters({ name: 'bar' })
      .run()
      .then(function (testCase) {

        //By default a subdirectory with the custom name is used
        var initProjectFolder = path.join(testCase.cwd, testCase.name);

        //'init:bower'
        var bowerFile = path.join(initProjectFolder, 'bower.json');
        expect(fs.existsSync(bowerFile)).toBe(true);

        var bowerFileContent = require(bowerFile);
        expect(bowerFileContent.name).toBe(testCase.name);
        expect(bowerFileContent.version).toBe('0.0.0');
        expect(bowerFileContent.private).toEqual(true);

        //'init:npm'
        expect(fs.existsSync(path.join(initProjectFolder, 'package.json'))).toBe(true);

        //'init:karma'
        expect(fs.existsSync(path.join(initProjectFolder, 'karma.conf.js'))).toBe(true);

        //'init:angularity'
        expect(fs.existsSync(path.join(initProjectFolder, 'angularity.json'))).toBe(true);

        //'init:jshint'
        expect(fs.existsSync(path.join(initProjectFolder, '.jshintrc'))).toBe(true);

        //'init:composition'
        var appPath = path.join(initProjectFolder, 'app');
        expect(fs.existsSync(path.join(appPath, 'index.html'))).toBe(true);
        expect(fs.existsSync(path.join(appPath, 'index.js'))).toBe(true);
        expect(fs.existsSync(path.join(appPath, 'index.scss'))).toBe(true);
      })
      .finally(done);
  });

});

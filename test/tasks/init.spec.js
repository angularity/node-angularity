'use strict';

var fs   = require('fs'),
    path = require('path');

var helper = require('../helpers/helper');

describe('The Angularity init task should correctly initialise all the files needed for a new project.', function () {

  afterEach(function(){
    helper.cleanTestTemp();
  });

  it('should correctly initialise a project with a custom name.', function (done) {
    var temporaryPath = helper.resolveTestTempPath('init-temp');
    process.chdir(temporaryPath);

    var customName = 'todo';

    helper.runAngularity(['init', '-n', customName])
      .then(function (result) {

        //By default a subdirectory with the custom name is used
        var initProjectFolder = path.join(temporaryPath, customName);

        //'init:bower'
        var bowerFile = path.join(initProjectFolder, 'bower.json');
        expect(fs.existsSync(bowerFile)).toBe(true);

        var bowerFileContent = require(bowerFile);
        expect(bowerFileContent.name).toBe(customName);
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

        done();
      });
  });

});

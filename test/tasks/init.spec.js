'use strict';

var fs   = require('fs'),
    path = require('path');

var helper = require('../helpers/helper');

describe('The Angularity init task should correctly initialise all the files needed for a new project.', function () {

  afterEach(function(){
    helper.cleanTestTemp();
  });

  it('should correctly initialise a project with a custom name.', function (done) {
    var initTempPath = helper.resolveTestTempPath('init-temp');
    process.chdir(initTempPath);

    var customName = 'todo';

    helper.runAngularity(['init', '-n', customName])
      .then(function (result) {

        //debug travis issue
        var lsCommand = (require('os').platform() === 'linux') ? 'ls -al' : 'echo %cd% && dir';
        console.log(require('shelljs').exec(lsCommand).stdout);

        //'init:bower'
        var bowerFile = path.join(initTempPath, 'bower.json');
        expect(fs.existsSync(bowerFile)).toBe(true);

        var bowerFileContent = require(bowerFile);
        expect(bowerFileContent.name).toBe(customName);
        expect(bowerFileContent.version).toBe('0.0.0');
        expect(bowerFileContent.private).toEqual(true);

        //'init:npm'
        expect(fs.existsSync(path.join(initTempPath, 'package.json'))).toBe(true);

        //'init:karma'
        expect(fs.existsSync(path.join(initTempPath, 'karma.conf.js'))).toBe(true);

        //'init:angularity'
        expect(fs.existsSync(path.join(initTempPath, 'angularity.json'))).toBe(true);

        //'init:jshint'
        expect(fs.existsSync(path.join(initTempPath, '.jshintrc'))).toBe(true);

        //debug travis issue
        console.log(path.join(initTempPath, '.gitignore'));

        //'init:gitignore'
        expect(fs.existsSync(path.join(initTempPath, '.gitignore'))).toBe(true);

        //'init:composition'
        var appPath = path.join(initTempPath, 'app');
        expect(fs.existsSync(path.join(appPath, 'index.html'))).toBe(true);
        expect(fs.existsSync(path.join(appPath, 'index.js'))).toBe(true);
        expect(fs.existsSync(path.join(appPath, 'index.scss'))).toBe(true);

        done();
      });
  });

});

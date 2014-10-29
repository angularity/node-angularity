(function () {
    /* globals process, console */
    'use strict';

    /**
     * Utility for reading the angularity configuration file.
     * By default the config is a `angularity.json` that should be located at the root
     * of the angularity project.
     *
     * This utility also makes sure that the package.json of the project is kept in sync with
     * angularity so that it can be distributed with npm.
     *
     * @type {exports} Object
     */
    var fs = require('fs'),
    path = require('path');

    function Config() {
        var angularityConfig,
            angularityConfigPath = path.join(process.cwd(), 'angularity.json'),
            angularityConfigPresent = fs.existsSync(angularityConfigPath);

        var npmConfigPath = path.join(process.cwd(), 'package.json'),
            npmConfigPresent = fs.existsSync(npmConfigPath),
            npmConfig;

        if (angularityConfigPresent) {
            angularityConfig = require(angularityConfigPath);

            if (!validateConfig(angularityConfig))
                console.error('There was an issue validating your angularity.json file.');
        }

        if (npmConfigPresent) {
            npmConfig = require(npmConfigPath);

            if (!validateConfig(angularityConfig))
                console.error('There was an issue validating your package.json file.');
        }

        if (angularityConfigPresent && npmConfigPresent) {
            // todo prompt to fs.write the highest version...
            if (angularityConfig.version !== npmConfig.version) {
                console.log('Your project\'s npm version is out of sync with your angularity.json');
                process.exit(1);
            }
        }

        return {
            angularityConfig       : angularityConfig,
            angularityConfigPresent: angularityConfigPresent,
            npmConfig              : npmConfig,
            npmConfigPresent       : npmConfigPresent
        };
    }

    //todo use a schema library like... https://github.com/apiaryio/Amanda
    function validateConfig(configData) {
        return ( typeof configData.name !== 'undefined' &&
        typeof configData.version !== 'undefined');
    }

    // Redundant but lets WebStorm autocomplete
    var configInstance = new Config();
    module.exports = configInstance;

}());

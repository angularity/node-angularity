/* globals basePath:true, files:true, exclude:true, reporters:true, port:true, colors:true, config:true */
/* globals autoWatch:true, browsers:true, captureTimeout:true, singleRun:true, reportSlowerThan:true */
/* globals LOG_DISABLE, LOG_ERROR, LOG_WARN, LOG_INFO, LOG_DEBUG */

// Karma configuration

module.exports = function(config) {
  config.set({
    // base path, that will be used to resolve files and exclude
    basePath: '/*ANGULARITY_BASE_PATH*/',

    //make sure we use karma-jasmine as the test framework
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    // angularity will package unit tests and append to the `files` array
    files: [].concat(/*ANGULARITY_FILE_LIST*/),

    // list of files to exclude
    exclude: [],

    // register any plugins which are not siblings of karma in angularity global
    // installation and thus need to be registered manually
    // append to existing value to preserve plugins loaded automatically
    plugins: [].concat(config.plugins).concat(/*ANGULARITY_PLUGIN_LIST*/),

    // use dots reporter, as travis terminal does not support escaping sequences
    // possible values: 'dots', 'progress', 'junit', 'teamcity'
    reporters: [].concat(/*ANGULARITY_REPORTER_LIST*/),

    // web server port
    port: <%= port %>,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['Chrome'],

    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 5000,

    // Auto run tests on start (when browsers are captured) and exit
    singleRun: true,

    // report which specs are slower than 500ms
    reportSlowerThan: 500
  });
};


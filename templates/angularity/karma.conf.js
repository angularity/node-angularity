/* globals basePath:true, files:true, exclude:true, reporters:true, port:true, colors:true, logLevel:true */
/* globals autoWatch:true, browsers:true, captureTimeout:true, singleRun:true, reportSlowerThan:true */
/* globals LOG_DISABLE, LOG_ERROR, LOG_WARN, LOG_INFO, LOG_DEBUG */

// base path, that will be used to resolve files and exclude
basePath = process.cwd();

// list of files / patterns to load in the browser
files = [];   // angularity will package unit tests and override the 'files' variable

// list of files to exclude
exclude = [];

// use dots reporter, as travis terminal does not support escaping sequences
// possible values: 'dots', 'progress', 'junit', 'teamcity'
reporters = [];

// web server port
port = <%= port %>;

// enable / disable colors in the output (reporters and logs)
colors = true;

// level of logging
// possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
logLevel = LOG_INFO;

// enable / disable watching file and executing tests whenever any file changes
autoWatch = false;

// Start these browsers, currently available:
// - Chrome
// - ChromeCanary
// - Firefox
// - Opera
// - Safari (only Mac)
// - PhantomJS
// - IE (only Windows)
browsers = ['Chrome'];

// If browser does not capture in given timeout [ms], kill it
captureTimeout = 5000;

// Auto run tests on start (when browsers are captured) and exit
singleRun = false;

// report which specs are slower than 500ms
reportSlowerThan = 500;
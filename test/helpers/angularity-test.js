/* globals it */
'use strict';

var Q          = require('q'),
    fs         = require('fs'),
    path       = require('path'),
    isArray    = require('lodash.isarray'),
    merge      = require('lodash.merge'),
    gulp       = require('gulp'),
    gulpRimraf = require('gulp-rimraf'),
    rimraf     = require('rimraf');

var cliTest    = require('./cli-test');

var TEST_SRC  = 'node_modules';
var TEST_TEMP = 'test/temp';

/**
 * Test runner base for angularity cli tests
 * @type {{create: {function}}}
 */
var runner = cliTest
  .create()
  .forProgram('angularity')
  .withDirectories(TEST_SRC, TEST_TEMP)
  .withSourceFilter(function removeBuildFiles(value) {
    return !(/app-\w+[\\\/]/.test(value));
  })
  .seal();

/**
 * Delete the test temp directory
 * @param {function} callback Callback for when deletion is complete
 */
function cleanUp(callback) {
  rimraf(path.resolve(TEST_TEMP), callback);
}

/**
 * Create a Jasmine <code>it</code> statement for enumerating test-runner cases in a <code>Array.forEach()</code>
 * @param {function} [onComplete] A method containing expectations to run on complete
 * @param {function} [onNotify] A method containing expectations to run on notify
 * @param {string} [title] Optional title for the jasmine <code>it</code> statement
 * @param {{before: {number}, after: {number}} options Options for the expectations
 * @returns {function} A method that when closed produces a <code>Array.forEach()</code> handler that itself returns a
 *                     promise
 */
function jasmineFactory(options) {
  function defaultHandler(testCase) {
    return testCase;
  }
  return function forExpectations(onComplete, onProgress, title) {
    var params = merge({
        title     : null,
        before    : 0,
        after     : 0,
        onComplete: defaultHandler,
        onProgress: defaultHandler
      },
      options,
      {
        onComplete: onComplete,
        onProgress: onProgress,
        title     : title
      });
    return function itForRunner(testRunner) {
      var deferred = Q.defer();
      it(title || testRunner, function (done) {
        testRunner
          .run()
          .progress(params.onProgress)
          .then(getDelay(params.before))
          .then(params.onComplete)
          .then(getDelay(params.after))
          .finally(done)
          .finally(deferred.resolve.bind(deferred));
      });
      return deferred.promise;
    };
  };
}

/**
 * Get a method that passes through its arguments to a promise after the given delay
 * @param {number} [milliseconds] Optional delay in milliseconds
 * @returns {Function}
 */
function getDelay(milliseconds) {
  return function () {
    var args     = Array.prototype.slice.call(arguments);
    var deferred = Q.defer();
    setTimeout(function() {
      deferred.resolve.apply(deferred, args);
    }, milliseconds || 0);
    return deferred.promise;
  };
}

/**
 * Create a method that will return a promise to delete the given files
 * @param {...string|Array.<string>} terms Any number of paths terms relative to the test case working directory
 * @returns {function} A method that returns a promise to the deletion
 */
function getFileDelete() {
  var terms = Array.prototype.slice.call(arguments);
  return function(testCase) {
    var deferred = Q.defer();
    var glob     = joinWide([testCase.cwd].concat(terms))
      .map(function (list) {
        return list.join(path.sep);
      })
      .map(function (text) {
        var split = text.split(/(!)/);
        return (split.length === 1) ? split[0] : split.slice(1).join('');
      });
    gulp.src(glob, {read: false})
      .pipe(gulpRimraf())
      .on('data', function() {})  // if there is no data handler end will not be called ?wtf?
      .on('end', function() {
        deferred.resolve(testCase);
      });
    return deferred.promise;
  };
}

/**
 * Create an object with the given fields set to random boolean values.
 * Where N fields are given there are 2.N results. The first N permutations assert a single field and the following N
 * values are random combinations with 0.5 probability of any given field being asserted. There are no repeat
 * combinations.
 * @param {Array.<string>} fields The constituent fields of the final object
 * @return {Array.<object>} An array of objects with the given fields and random boolean values
 */
function randomFlags(fields) {
  var results = [];
  var hashes  = [];
  for (var i = 0; results.length < 2 * fields.length; i++) {
    var paramSet = {};
    for (var j = 0; j < fields.length; j++) {
      var field = fields[j];
      paramSet[field] = (i < fields.length) ? (j === i) : (Math.random() < 0.5);
    }
    var hash = JSON.stringify(paramSet);
    if (hashes.indexOf(hash) < 0) {
      hashes.push(hash);
      results.push(paramSet);
    }
  }
  return results;
}

/**
 * Concatenate the corresponding indices of all terms together.
 * For example the terms [ 1, [2, 3] 4] yield the result [[1, 2, 4], [1, 3, 4]].
 * @param {Array.<string|Array.<string>>} terms Any number of strings or arrays
 * @returns {Array}
 */
function joinWide(terms) {
  var results = [];
  var width   = 0;
  terms
    .map(findWidth)
    .map(widenTerms)
    .forEach(transpose);
  return results;

  function findWidth(value) {
    var inferred = isArray(value) ? value.length : 1;
    if ((width > 1) && (inferred > 1) && (width !== inferred)) {
      throw new Error('Arrays arguments must all be the same length');
    }  else {
      width = inferred;
    }
    return [].concat(value);
  }

  function widenTerms(term) {
    while (term.length < width) {
      term.push(term[0]);
    }
    return term;
  }

  function transpose(term) {
    term
      .forEach(function (element, i) {
        var array = results[i] || [];
        results[i] = array;
        array.push(element);
      });
  }
}

var timeoutIntervals = [];

/**
 * Switch to a different watchdog timeout length
 * @param {number} [value] The timeout value in milliseconds or missing to reinstate the previous timeout
 * @returns {Function} A closure that will apply the change
 */
function getTimeoutSwitch(value) {
  return function () {
    if (value) {
      timeoutIntervals.push(jasmine.DEFAULT_TIMEOUT_INTERVAL);
      jasmine.DEFAULT_TIMEOUT_INTERVAL = value;
    } else {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = timeoutIntervals.pop();
    }
  };
}

/**
 * Get a method whose arguments concatenate following the arguments of the outer function
 * @param {...string} prefix Any number of leading elements
 * @returns {function} A method that will concatenate its arguments to the prefix and return an array
 */
function getConcatenation() {
  var prefix = Array.prototype.slice.call(arguments);
  return function() {
    var suffix = Array.prototype.slice.call(arguments);
    return prefix.concat(suffix);
  };
}

/**
 * A utility equivalent to performing <code>String.replace()</code> using the contents of each <code>add()</code>
 * statement
 * @returns {{add: function, commit: function}}
 */
function replacer() {
  var list = [];
  var self = {
    add: function(before, after) {
      list.push({
        before: before,
        after : after
      });
      return self;
    },
    commit: function() {
      return function(pathElements) {
        var filePath = path.resolve.apply(path, [].concat(pathElements));
        var text     = fs.existsSync(filePath) && fs.readFileSync(filePath).toString();
        function replaceSingle(item) {
          if (text) {
            if (typeof item.before === 'string') {
              while (text.indexOf(item.before) >= 0) {
                text = text.replace(item.before, item.after);
              }
            } else if ((typeof item.before === 'object') && ('test' in item.before)) {
              text = text.replace(item.before, item.after);
            }
          }
          return text;
        }
        list.forEach(replaceSingle);
        return text;
      };
    }
  };
  return self;
}

module.exports = {
  runner          : runner,
  cleanUp         : cleanUp,
  jasmineFactory  : jasmineFactory,
  getDelay        : getDelay,
  getFileDelete   : getFileDelete,
  randomFlags     : randomFlags,
  getTimeoutSwitch: getTimeoutSwitch,
  getConcatenation: getConcatenation,
  replacer        : replacer
};

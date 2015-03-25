'use strict';

var path         = require('path'),
    fs           = require('fs'),
    Q            = require('q'),
    ncp          = require('ncp'),
    defaults     = require('lodash.defaults'),
    flatten      = require('lodash.flatten'),
    template     = require('lodash.template'),
    isArray      = require('lodash.isarray'),
    childProcess = require('child_process'),
    psTree       = require('ps-tree');

var platform = require('../../lib/config/platform');

/**
 * Create an instance based with the given parameter defaults.
 * Since this method is not exposed to the user we can rely on <code>base</code> to be correctly formed with array
 * properties.
 * @param {object} [base] Optional default set of parameters to merge
 * @returns {{create: {function}, reset: {function}, seal: {function}, withDirectories: {function},
 *          forProgram: {function}, addSource: {function}, withSourceFilter: {function}, addExpectation: {function},
 *          addInvocation: {function}, run: {function}}} A new instance
 */
function factory(base) {

  // initialise parameters
  var params;
  reset();

  // compose instance
  var self = {
    create          : create,
    toString        : toString,
    reset           : reset,
    seal            : seal,
    withDirectories : withDirectories,
    withTimeout     : withTimeout,
    forProgram      : forProgram,
    addSource       : addSource,
    withSourceFilter: withSourceFilter,
    addExpectation  : addExpectation,
    addInvocation   : addInvocation,
    addParameters   : addParameters,
    toArray         : toArray,
    forEach         : forEach,
    run             : run
  };
  return self;

  /**
   * Create a new instance with a separate set of properties
   * @returns {Object}
   */
  function create() {
    return factory(params);
  }

  /**
   * Infer the command from the first invocation/parameter-set combination
   * @returns {string} The inferred command
   */
  function toString() {
    var invocation = params.invocations[0]   || [];
    var paramSet   = params.parameterSets[0] || {};
    function resolveTemplate(item) {
      return template(item, paramSet, {interpolate: /\{\s*(\w+)\s*\}/});
    }
    return [params.program]
      .concat(invocation.map(resolveTemplate))
      .join(' ');
  }

  /**
   * Reset the instance parameters but leave its defaults unchanged
   * @returns {object} The same instance with mutated properties
   */
  function reset() {

    // default value
    params = {
      directories  : {},
      sources      : [],
      filter       : null,
      timeout      : false,
      program      : null,
      expectations : [],
      invocations  : [],
      parameterSets: [],
      hasRun       : false
    };

    // clone params, must duplicate arrays
    for (var key in base || {}) {
      var value = base[key];
      params[key] = isArray(value) ? value.concat() : value;
    }

    // complete
    return self;
  }

  /**
   * Get a copy of the instance that
   * @returns {{create: create}}
   */
  function seal() {
    return {
      create: create
    };
  }

  /**
   * Set the directories that will be used
   * @param {string} source The directory that contains sources
   * @param {string} temp The directory that will be used as the temp directory
   * @returns {object} The same instance with mutated properties
   */
  function withDirectories(source, temp) {
    params.directories.source = source;
    params.directories.temp   = temp;
    return self;
  }

  /**
   * Set the watchdog timeout that will end the process when elapsed
   * @param {number} [milliseconds] The timeout in milliseconds or omitted for no timeout
   * @returns {object} The same instance with mutated properties
   */
  function withTimeout(milliseconds) {
    params.timeout = (typeof milliseconds === 'number') && Math.max(0, milliseconds);
    return self;
  }

  /**
   * Set the program that will be run
   * @param {string} program The program name
   * @returns {object} The same instance with mutated properties
   */
  function forProgram(program) {
    params.program = program;
    return self;
  }

  /**
   * Add the given source directory
   * @param {string} source The simple name of a directory in the <code>expected</code> folder
   * @returns {object} The same instance with mutated properties
   */
  function addSource(source) {
    params.sources.push(source);
    return self;
  }

  /**
   * Set the filter to control which source files are copied to the working directory
   * @param {RegExp|function} filter A regular expression or a function that tests a given directory path
   * @returns {object} The same instance with mutated properties
   */
  function withSourceFilter(filter) {
    params.filter = filter;
    return self;
  }

  /**
   * Add the given expectation
   * @param {function} expectation A function with jasmine expectations
   * @returns {object} The same instance with mutated properties
   */
  function addExpectation(expectation) {
    params.expectations.push(expectation);
    return self;
  }

  /**
   * Add the given command line argument set as a test case
   * @param {...string} parameters Any number of arguments for the command line
   * @returns {object} The same instance with mutated properties
   */
  function addInvocation() {
    var args = flatten(Array.prototype.slice.call(arguments));
    params.invocations.push(args);
    return self;
  }

  /**
   * Add the given parameter set as a test case
   * @param {object} parameters Values that will substitute into the invocation template
   */
  function addParameters(parameters) {
    params.parameterSets.push(parameters);
    return self;
  }

  /**
   * Enumerate all test cases
   * @param {function} callback The method to call with the instance and the test case
   */
  function toArray() {
    var sources       = params.sources.length       ? params.sources       : [null];
    var parameterSets = params.parameterSets.length ? params.parameterSets : [ {} ];
    var results       = [];
    parameterSets.forEach(function eachParamSet(paramSet) {
      sources.forEach(function eachSource(source) {
        params.invocations.forEach(function eachInvocation(invocation) {

          // create an isolated instance
          var instance = factory(defaults({
            sources      : [source],
            invocations  : [invocation],
            parameterSets: [paramSet]
          }, params));

          // accumulate instances
          results.push(instance);
        });
      });
    });
    return results;
  }

  /**
   * Iterate all the test cases per <code>toArray()</code>
   * @param {function} method The method that each case will be applied to and which should return a promise
   * @return {promise} A promise that resolves when all method promises resolve
   */
  function forEach(method) {
    return Q.all(toArray().map(method));
  }

  /**
   * Execute the parameters encoded in the current instance as a test.
   * If run has occurred before (without reset) then the source will not be re-copied to the working folder.
   * @returns {{then: {function}, catch: {function}, finally: {function}} A promise that resolves when tests complete
   */
  function run() {

    // if we can get a list of single instances we recurse them
    var list = toArray();
    if (list.length > 1) {
      var promises = list
        .map(function(instance) {
          return instance.run();
        });
      return Q.all(promises);
    }
    // otherwise single instance
    else {
      return runSingle();
    }
  }

  /**
   * Run the first permutation of sources and parameter sets
   * @returns {{then: {function}, catch: {function}, finally: {function}, notify: {function}} A promise that resolves
   *          when test completes and notifies when buffers are updated
   */
  function runSingle() {

    // execution parameters
    var resolveSrc  = ensureDirectory(params.directories.source);
    var resolveDest = ensureDirectory(params.directories.temp);
    var source      = params.sources[0];
    var paramSet    = params.parameterSets[0];

    // execution state
    var stdio = {stdout: '', stderr: ''};
    var child = null;
    var timeout;

    // each combination is async
    var deferred = Q.defer();

    // determine the overall command we will run
    var command = toString();

    // organise a working directory
    var signature = escapeFilenameString(source, command);
    var src       = !params.hasRun && resolveSrc(source);
    var cwd       = resolveDest(signature);
    copySources(src, cwd, onCopyComplete);

    // handler for end of copy process
    function onCopyComplete(error) {

      // error in copying implies rejected async
      if (error) {
        deferred.reject(error);
      }
      // run the command
      else {

        // spawn a child process in an exec()-like manner
        //  https://github.com/joyent/node/issues/2318#issuecomment-32706753
        var args = platform.isWindows() ?
          ['cmd.exe', ['/s', '/c', '"' + command + '"']] :
          ['/bin/sh', ['-c', command]];
        child = childProcess.spawn.apply(childProcess, args.concat({
          cwd                     : cwd,
          stdio                   : 'pipe',
          windowsVerbatimArguments: true
        }));

        // add listeners to the child process
        notifyOn('stdout');
        notifyOn('stderr');
        child.on('close', onClose);

        // start the watchdog timer
        useTimeout(true);
      }
    }

    // clear the watchdog timeout and optionally start another
    function useTimeout(isStart) {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (isStart) {
        timeout = setTimeout(kill, params.timeout || 1E+9);
      }
    }

    // progress on stdio
    function notifyOn(name) {
      var stream = child[name];
      stream.on('readable', function onReadable() {
        var chunk = stream.read();
        if (chunk !== null) {

          // cancel watchdog timeout
          useTimeout(true);

          // append the chunk to the stream text
          stdio[name] = (stdio[name] || '') + chunk.toString();

          // progress the promise
          var testCase = getTestCase({kill: kill}, paramSet);
          deferred.notify(testCase);
        }
      });
    }

    // async resolution on process complete or timeout
    function onClose(exitcode) {

      // ensure idempotence
      if (child) {
        child = undefined;

        // cancel watchdog timeout and mark as run
        useTimeout(false);
        params.hasRun = true;

        // wait for next tick to avoid any possibility of race condition
        process.nextTick(function nextTickResolve() {

          // resolve the promise
          var testCase = getTestCase({exitcode: exitcode}, paramSet);
          deferred.resolve(testCase);
        });
      }
    }

    // the test case is the merge of the test stats and the given arguments, usually the parameter set
    function getTestCase() {
      var args      = Array.prototype.slice.call(arguments);
      var testStats = {
        sourceDir: src,
        runner   : self,
        cwd      : cwd,
        command  : command,
        stdout   : stdio.stdout,
        stderr   : stdio.stderr
      };
      return defaults.apply(null, [testStats].concat(args));
    }

    // kill the child process
    function kill() {

      // child will be valid unless onClose() has already run
      //  and if onClose() has already run we don't want to be here anyhow
      if (child) {

        // only killing the full process tree will work consistently on windows and unix
        //  https://github.com/travis-ci/travis-ci/issues/704
        //  https://www.npmjs.com/package/ps-tree
        if (platform.isWindows()) {
          childProcess.spawn('taskkill', ['/f', '/t', '/PID', child.pid]);
        } else {
          psTree(child.pid, function onProcessTree(err, processChildren) {
            //NOTE sometimes child may have been killed or completed
            // in between, and callback does execute on process.nextTick
            if (child) {
              var pidList = processChildren
                .map(function getChildPID(processChild) {
                  return processChild.PID;
                })
                .concat(child.pid);
              childProcess.spawn('kill', ['-9'].concat(pidList));
            }
          });
        }
      }
    }

    // async until process completes
    return deferred.promise;
  }

  /**
   * Use ncp to copy files
   * @param {string|null} src The source directory
   * @param {string} dest The destination directory
   * @param {function} callback Completion callback
   */
  function copySources(src, dest, callback) {
    if (src) {
      ncp(src, dest, {
        filter: params.filter || /.*/
      }, callback);
    } else {
      ensureDirectory(dest);
      callback();
    }
  }
}

/**
 * Flatten the given parameters as a single string suitable for file names
 * @param {...string|Array} Any number of strings or arrays thereof
 * @returns {string} A dot delimited string
 */
function escapeFilenameString() {
  return flatten(Array.prototype.slice.call(arguments))
    .filter(Boolean)
    .join('.')
    .replace(/["']/g, '')                                                                     // omit quotes
    .replace(/[^ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-]+/g, '.');  // change illegal chars
}

/**
 * Ensure that that given directory exists relative to the project directory
 * @param {...string} elements Any number of path elements relative to the project directory
 * @returns {function} A resolver that encapsulates the given directory
 */
function ensureDirectory() {

  // get a method that will path.resolve() against a base directory
  function getResolver(base) {
    return function() {
      var args = flatten(Array.prototype.slice.call(arguments));
      if (args.every(Boolean)) {
        return path.resolve.apply(path, [base].concat(args));
      } else {
        return null;
      }
    };
  }

  // find the project directory based on the package json
  var projectDir = __dirname;
  while (!fs.existsSync(path.join(projectDir, 'package.json'))) {
    projectDir = path.resolve(projectDir, '..');
  }

  // resolve the given directory path and make the directory if it does not exist
  var args     = Array.prototype.slice.call(arguments);
  var resolved = getResolver(projectDir)(args);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved);
  }

  // return the resolver
  return getResolver(resolved);
}

module.exports = {
  create: function() {
    return factory();
  }
};

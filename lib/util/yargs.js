'use strict';

var yargs = require('yargs');

var instances = { };

/**
 * Retrieve a sub-command (task) that may be independently described
 * @param {string} taskName The name of the sub-command or null for the overall command
 * @returns {yargs} The same yargs instance for each unique taskName
 */
function getInstance(taskName) {
  var lowercase = (typeof taskName === 'string') ? taskName.toLowerCase() : ''; // allow zero length
  instances[lowercase] = instances[lowercase] || yargs(process.argv.slice(2));
  instances[lowercase].argv;  // must access argv to avoid runtime error later
  return instances[lowercase];
}

/**
 * Retreive the argv for the yargs instance that is implied by the given sub-command.
 * Non-zero length of argv._ indicates superfluous arguments.
 * @returns {object} A yargs.argv object
 */
function resolveArgv() {
  var instance = instances[''];
  var argv     = instance ? instance.argv : {};
  var taskName = argv._ && argv._[0] && argv._[0].toLowerCase();
  if (taskName && (taskName in instances)) {
    instance      = instances[taskName];
    argv          = instance.argv;
    argv.taskName = argv._.shift();
  }
  return argv;
}

/**
 * Retrieve a sorted list of sub-command (tas) names
 * @returns {Array} A list of tasks sorted alphabetically
 */
function listTasks() {
  return Object
    .getOwnPropertyNames(instances)
    .filter(Boolean)
    .sort();
}

/**
 * Check that any additional arugments are only the subcommand
 * @param {Object} argv parsed argv hash
 * @param {Array} options options and their aliases
 * @throws Error where task is improperly specified
 */
function subCommandCheck(argv, options) {
  var bareArguments = argv._;
  if (bareArguments) {
    if (bareArguments.length > 1) {
      throw new Error('Too many tasks specified: '+ bareArguments.slice(1));
    } else if ((bareArguments.length == 1) && listTasks().indexOf(bareArguments[0]) < 0) {
      throw new Error('Unknown task: ' + bareArguments[0]);
    }
  }
}

/**
* A strict checking function that allows long options to be specified with a single dash
* @param {Object} argv parsed argv hash
* @param {Array} options options and their aliases
* @throws Error where there are superfluous arguments
*/
function singleDashCheck(argv, options) {

  // get all argv fields
  var pending = Object.keys(argv)
    .filter(function removeSpecialKeys(key) {
      return (['_', '$0'].indexOf(key) < 0);
    });

  // convenience to remove an element from the pending list
  function removeElement(element) {
    var index = pending.indexOf(element);
    if (index >= 0) {
      pending.splice(index, 1);
    }
  }

  // for each key
  for (var key in options) {

    // remove this key
    removeElement(key);

    // for each alias, remove the characters between their matching substring
    //  i.e. -version|-v => remove: e, r, s, i, o, n
    (options[key] || []).forEach(function eachAlias(alias) {
        var comparable = alias.slice(0, key.length);
        if (comparable === key) {
          alias.slice(key.length).split('').forEach(removeElement);
        }
      });
  }

  // error message
  if (pending.length) {
    throw new Error('Superfluous arguments: ' + pending.join(', '))
  }
}

/**
 * Given an object of field:fn will apply each fn to the value of the same fields.
 * Where the given methods return a string, that will be used to raise an error.
 */
function createCheck() {
  var NONE        = 0,
      GATE_METHOD = 1,
      TEST_METHOD = 2,
      TEST_OBJECT = 3;

  // instance methods
  var elements = [ ];
  var self     = {
    withGate: function(element) {
      elements.push(element, GATE_METHOD);
      return self;
    },
    withTest: function(element) {
      var type = (typeof element === 'function') ? TEST_METHOD : (typeof element === 'object') ? TEST_OBJECT : NONE;
      elements.push(element, type);
      return self;
    },
    commit: function() {
      return getCheck(elements); // lock in the current instance state
    }
  }

  // the implementation of the yargs check method
  function getCheck(elements) {
    function throwString(value) {
      if (typeof value === 'string') {
        throw new Error(value);
      }
    }
    return function check(argv) {
      for (var i = 0; i < elements.length; i += 2) {
        var element = elements[i];
        var type = elements[i + 1];
        if (type === GATE_METHOD) {
          if (!element(argv)) break;
        } else if (type === TEST_METHOD) {
          throwString(element(argv));
        } else if (type === TEST_OBJECT) {
          for (var key in element) {
            if (key in argv) {
              throwString(element[key](argv[key]));
            }
          }
        }
      }
    };
  }

  // complete
  return self;
}

module.exports = {
  getInstance    : getInstance,
  resolveArgv    : resolveArgv,
  listTasks      : listTasks,
  subCommandCheck: subCommandCheck,
  singleDashCheck: singleDashCheck,
  createCheck    : createCheck
};
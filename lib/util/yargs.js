'use strict';

var yargs = require('yargs');

var config = require('../config/config');

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
 * @throws Error where task is improperty specified
 */
function subCommandCheck(argv, options) {
  var bareArguments = argv._;
  if (bareArguments) {
    if (bareArguments.length > 1) {
      throw new Error('Too many tasks specified');
    } else if ((bareArguments.length == 1) && listTasks().indexOf(bareArguments[0]) < 0) {
      throw new Error('Unknown task: ' + bareArguments[0]);
    }
  }
}

/**
* A strict checking function that allows long options to be specified with a single dash
* @param {Object} argv parsed argv hash
* @param {Array} options options and their aliases
* @returns {boolean}
*/
function singleDashCheck(argv, options) {

  // get all argv fields
  var pending = Object.keys(argv)
    .filter(function removeSpecialKeys(key) {
      return (['_', '$0'].indexOf(key) < 0);
    });
  console.log(pending);

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

//
//  .describe('wsp', 'Optional absolute path to the Webstorm IDE where installed')
//    .alias('wsp', 'webstorm-path')
//    .string('wsp')
//
//  //
//  .describe('n', 'The name of the project in the current working directory')
//    .alias('n', 'name')
//    .string('n')
//    .default('n', 'my-project')
//
//  .wrap(80);

module.exports = {
  getInstance    : getInstance,
  resolveArgv    : resolveArgv,
  listTasks      : listTasks,
  subCommandCheck: subCommandCheck,
  singleDashCheck: singleDashCheck
};
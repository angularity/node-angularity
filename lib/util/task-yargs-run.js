'use strict';

var taskYargsRun = require('task-yargs/run');
var tyRunInstance = taskYargsRun();

//NOTE This file is to maintain a single task yargs run instance,
// as we wish to use the same one across multiple gulp tasks.
// In addition, we may augment or proxy some methods within it.

function checkFlagMissing(opt, key, value) {
  if ((!!opt.value.isOptional) &&
    (typeof value === 'undefined')) {
    // all other options must be specified, or have default defined
    return true;
  }
  if ((typeof value === 'undefined') ||
    ((typeof value === 'string') && (value.length < 1) && (key !== 'description'))) {
    throw new Error('Required option "' + key + '" is not specified');
  }
}

function checkFlagType(opt, key, value) {
  var valueType = (typeof value);
  var typeIsOk = false;
  var validTypes = ['string', 'boolean', 'number']
    .filter(function(selType) {
      return !!(opt.value[selType]);
    });
  if (!opt.value.isMultiple) {
    validTypes.forEach(function(validType) {
      if (valueType === validType) {
        typeIsOk = true;
      }
    });
  }
  else {
    value = [].concat(value);
    if (value.length === 0) {
      typeIsOk = true;
    }
    else {
      value.forEach(function (subValue) {
        validTypes.forEach(function(validType) {
          if (typeof subValue === validType) {
            typeIsOk = true;
          }
        });
      });
    }
  }
  if (!typeIsOk) {
    var expectedType = JSON.stringify(validTypes);
    if (opt.value.isMultiple) {
      expectedType = 'Array<' + expectedType + '>';
    }
    throw new Error('' + key + ' is expected to be of types ' +
      expectedType + ' but a ' + (typeof value) + ' was provided instead.');
  }
}

tyRunInstance.checkFlagType = checkFlagType;
tyRunInstance.checkFlagMissing = checkFlagMissing;

module.exports = tyRunInstance;

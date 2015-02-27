'use strict';

var taskYargs = require('task-yargs');
var taskYargsInstance = taskYargs();

//NOTE This file is to maintain a single task yargs instance,
// as we wish to use the same one across multiple gulp tasks.
// In addition, we may augment or proxy some methods within it.

module.exports = taskYargsInstance;

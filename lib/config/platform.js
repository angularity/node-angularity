'use strict';

/**
 * A string representing the current OS platform
 * @type {string} 'windows' or 'unix'
 */
var PLATFORM = (['win32', 'win64'].indexOf(process.platform) >= 0) ?
  'windows' :
  ((process.platform === 'darwin') ? 'darwin' : 'unix');

/**
 * Indicates whether the current platform is windows
 * @returns {boolean} true for windows, else false
 */
function isWindows() {
  return (PLATFORM === 'windows');
}

/**
 * Indicates whether the current platform is darwin
 * @returns {boolean} true for darwin, else false
 */
function isMacOS() {
  return (PLATFORM === 'darwin');
}

/**
 * Indicates whether the current platform is unix
 * @returns {boolean} true for unix, else false
 */
function isUnix() {
  return (PLATFORM === 'unix');
}

/**
 * The user home directory
 * @returns {string} The path to the user home directory
 */
function userHomeDirectory() {
  return (PLATFORM === 'windows') ? process.env.USERPROFILE : process.env.HOME;
}

module.exports = {
  isWindows        : isWindows,
  isMacOS          : isMacOS,
  isUnix           : isUnix,
  userHomeDirectory: userHomeDirectory
}

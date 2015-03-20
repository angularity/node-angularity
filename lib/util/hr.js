'use strict';

/**
 * Create a text banner with a title that is centred and double spaced
 * @param {string} char The character that makes up the banner
 * @param {number} length The length of the resultant banner
 * @param {string} [title] An optional title to centre in the banner
 * @returns {string} The banner text
 */
function hr(char, length, title) {
  var text = (title) ? (' ' + title.split('').join(' ').toUpperCase() + ' ') : '';  // double spaced title text
  while (text.length < length) {
    text = char + text + char;  // centre title between the given character
  }
  return text.slice(0, length); // enforce length, left justified
}

module.exports = hr;
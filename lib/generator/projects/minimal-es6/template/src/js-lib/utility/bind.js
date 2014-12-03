/**
 * <p>Bind any method or accessors in the given descriptor to the given target.</p>
 * @param {object} descriptor Descriptor as returned by <code>Object.getOwnPropertyDescriptor()</code>
 * @param {object} target The object that methods will be bound to
 */
function bindDescriptor(descriptor, target) {
  'use strict';
  var FIELDS = [ 'get', 'set', 'value' ];
  for (var field of FIELDS) {
    if ((field in descriptor) && (typeof descriptor[field] === 'function')) {
      descriptor[field] = descriptor[field].bind(target);
    }
  }
}

/**
 * <p>Bind all methods and accessors of the given candidate to itself (in-place) and return the candidate.</p>
 * @param {object} candidate An instance with a prototype
 * @returns {object} The given candidate
 */
export default function bind(candidate) {
  'use strict';
  if (typeof candidate === 'object') {
    for (var name in candidate) {
      var prototype  = null;
      var descriptor = null;
      do {
        prototype  = Object.getPrototypeOf(prototype || candidate);
        descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      } while (prototype && !(descriptor));
      bindDescriptor(descriptor, candidate);
      Object.defineProperty(candidate, name, descriptor);
    }
  }
  return candidate;
}

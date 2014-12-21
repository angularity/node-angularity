export default function extend(destination, ...sources) {
  'use strict';
  if (typeof destination === 'object') {
    for (var source of sources) {
      for (var name in source) {
        if (name !== 'constructor') {
          var descriptor = Object.getOwnPropertyDescriptor(source, name);
          if (descriptor) {
            Object.defineProperty(destination, name, descriptor);
          }
        }
      }
    }
  }
}

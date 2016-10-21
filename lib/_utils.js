/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var define = Object.defineProperty;

function property(obj, name, getfn, setfn, configurable, enumerable) {
  var undef;
  if (typeof setfn !== 'function') {
    enumerable = configurable;
    configurable = setfn;
    setfn = undef;
  }

  define(obj, name, {
    configurable: !!configurable,
    enumerable: !!enumerable,
    get: getfn,
    set: setfn
  });
}

function constant(obj, name, value, configurable, enumerable) {
  define(obj, name, {
    configurable: !!configurable,
    writable: false,
    enumerable: !!enumerable,
    value: value
  });
}

function hidden(obj, name, value, configurable, writable) {
  define(obj, name, {
    configurable: !!configurable,
    writable: !!writable,
    enumerable: false,
    value: value
  });
}

module.exports = {
  property: property,
  constant: constant,
  hidden: hidden
};

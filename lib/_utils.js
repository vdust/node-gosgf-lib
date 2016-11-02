/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var define = Object.defineProperty;

/**
 * Define a property with getter and setter functions.
 *
 * This is a wrapping of Object.defineProperty to allow smaller code size by
 * using different defaults.
 *
 * @param {object} obj - The object to define property on
 * @param {string} name - The name of the property
 * @param {function} getter - A getter function
 * @param {function} [setter] - An optional setter function
 * @param {boolean} [configurable] - Whether the property can be redefined
 * @param {boolean} [enumerable] - Whether the property should be enumerabled.
 *    `configurable` must be the previous argument for `enumarable` to be
 *    passed in explicitly
 *
 * @name _utils.property
 * @private
 */
function property(obj, name, getter, setter, configurable, enumerable) {
  var undef;
  if (typeof setter !== 'function') {
    enumerable = configurable;
    configurable = setter;
    setter = undef;
  }

  define(obj, name, {
    configurable: !!configurable,
    enumerable: !!enumerable,
    get: getter,
    set: setter
  });
}

/**
 * Define a constant property.
 *
 * @param {object} obj - The object to define the constant on
 * @param {string} name - The name of the property
 * @param {*} value - The constant value
 * @param {boolean} [configurable] - Whether the property can be redefined
 * @param {boolean} [enumerable] - Whether the property should be enumerabled.
 *    `configurable` must be the previous argument for `enumarable` to be
 *    passed in explicitly
 *
 * @name _utils.constant
 * @private
 */
function constant(obj, name, value, configurable, enumerable) {
  define(obj, name, {
    configurable: !!configurable,
    writable: false,
    enumerable: !!enumerable,
    value: value
  });
}

/**
 * Define a hidden property.
 *
 * @param {obect} obj - The object to define the constant on
 * @param {string} name - The name of the property
 * @param {*} value - The value of the hidden property
 * @param {boolean} [configurable] - Whether the property can be redefined
 * @param {boolean} [writable] - Whether the property should be writable
 *
 * @name _utils.hidden
 * @private
 */
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

/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var NONE = 0, BLACK = 1, WHITE = 2;

/**
 * Create new intersection object.
 *
 * @alias GoSgf.Board.Intersection
 * @constructor
 */
function Intersection() {
  this.color = this.NONE;
}

/**
 * Constant for empty intersection
 * @const {number}
 * @default 0
 */
Intersection.NONE = NONE;
/**
 * Constant for Black move
 * @const {number}
 * @default 1
 */
Intersection.BLACK = BLACK;
/**
 * Constant for White move
 * @const {number}
 * @default 2
 */
Intersection.WHITE = WHITE;

/**
 * Parse a color definition.
 *
 * @param {string|number} color - The color to parse. If a `string`, it can be
 *        (case insensitive): `'w'`, `'white'`, `'b'` or `'black'`.
 *        If a number, it should be equal to `1` or `2`.
 *
 * @returns {number} {@link GoSgf.Board.Intersection.BLACK|BLACK} or
 *          {@link GoSgf.Board.Intersection.WHITE|WHITE} if color is parsed
 *          successfully.
 *          Returns {@link GoSgf.Board.Intersection.NONE|NONE} otherwise.
 */
Intersection.getColor = function (color) {
  var self = this || Intersection;

  if (typeof color === 'string') {
    if ((/^b(?:lack)?$/i).test(color)) color = BLACK;
    else if ((/^w(?:hite)?$/i).test(color)) color = WHITE;
    else color = NONE;
  } else {
    color = +color
    if (color !== BLACK && color !== WHITE) color = NONE;
  }

  return color;
};

/**
 * Get the opposite color.
 *
 * @param {string|number} color - A parsable color.
 *
 * @returns {number} The color opposite to `color`, or
 *          {@link GoSgf.Board.Intersection.NONE|NONE} on error.
 */
Intersection.not = function (color) {
  var self = this || Intersection;

  if (color == null) {
    color = self.color || NONE;
  } else color = self.getColor(color);

  return color === BLACK ? WHITE : (color === WHITE ? BLACK : NONE);
}

Intersection.prototype = {
  /**
   * Constant for empty intersection
   * @const {number}
   * @default 0
   */
  NONE: Intersection.NONE,
  /**
   * Constant for Black move
   * @const {number}
   * @default 1
   */
  BLACK: Intersection.BLACK,
  /**
   * Constant for White move
   * @const {number}
   * @default 2
   */
  WHITE: Intersection.WHITE,
  /**
   * Parse a color definition.
   *
   * @param {string|number} color - The color to parse. If a `string`, it can
   *        be (case insensitive): 'w', 'white', 'b' or 'black'. If a number,
   *        it should be equal to 1 or 2.
   *
   * @returns {number} {@link GoSgf.Board.Intersection.BLACK|BLACK} or
   *          {@link GoSgf.Board.Intersection.WHITE|WHITE} if color is
   *          parsed successfully.
   *          Returns {@link GoSgf.Board.Intersection.NONE|NONE} otherwise.
   */
  getColor: Intersection.getColor,
  /**
   * Get the opposite color.
   *
   * @param {string|number} [color] - A parsable color. If ommitted, use
   *        the current intersection's color.
   *
   * @returns {number} The color opposite to `color`, or
   *          {@link GoSgf.Board.Intersection.NONE|NONE} on error.
   */
  not: Intersection.not,
  /**
   * Clone the instersection instance and all its data. Only Owned properties
   * are cloned.
   *
   * The current implementation uses `JSON.parse(JSON.stringify(this))` to
   * clone properties, losing any constructor informations on objects.
   *
   * @returns {GoSgf.Board.Intersection} A newly-created intersection
   *          instance.
   */
  clone: function () {
    // FIXME: This is the easy-fast-and-ugly way.
    // Intersection properties should be properly normalized here.
    return Object.assign(new Intersection(), JSON.parse(JSON.strinfigy(this)));
  }
};

module.exports = Intersection;

/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var Nav = require('./nav.js');
var Parser = require('./parser.js');
var Spec = require('./spec.js');

/**
 * Create a new GoSgf instance.
 *
 * @param {boolean|string|GoSgf.GameTree|GoSgf.GameTree[]} [data] - Data to add
 *        to the collection. (see {@link GoSgf#add|GoSgf#add()})
 * @param {boolean} [keepRaw] - Whether to keep the
 *        {@link GoSgf.Spec.Node#_raw|Node#_raw} property when parsing SGF data.
 *
 * @constructor
 */
function GoSgf(data, keepRaw) {
  /**
   * The parser instance.
   * @type {GoSgf.Parser}
   */
  this.parser = new Parser();

  /**
   * Whether to keep the {@link GoSgf.Spec.Node#_raw|Node#_raw} property in
   * parsed data. If `false`, the property is removed along unknown properties.
   * @type {boolean}
   */
  this.keepRaw = !!keepRaw;

  this.clear(data);
}

/* Expose all classes at top level */

GoSgf.Board = require('./board.js');
GoSgf.GameTree = require('./gametree.js');
GoSgf.Nav = Nav;
GoSgf.Parser = Parser;
GoSgf.Spec = Spec;

GoSgf.prototype = {
  /**
   * Clear the collection and add optional new data to it.
   *
   * @param {boolean|string|GoSgf.GameTree|GoSgf.GameTree[]} [data] - Data to
   *        add to the collection. (see {@link GoSgf#add|GoSgf#add()})
   */
  clear: function (data) {
    /**
     * A collection of gametrees.
     * @type {GoSgf.GameTree[]}
     */
    this.collection = [];

    if (data) this.add(data);
  },
  /**
   * Add gametrees to the collection.
   *
   * `data` is processed differently depending on its type:
   *
   *   - `data === true`: Add an empty gametree (single root node with default
   *     board size of 19x19).
   *   - `string`: Add gametrees returned by
   *     {@link GoSgf.Parser#parse|Parser#parse()}
   *   - `GameTree`: Add the gametree as is.
   *   - `GameTree[]`: Add the gametrees as is.
   *
   * Throws an error if data is not of any of the above types.
   *
   * @param {boolean|string|GoSgf.GameTree|GoSgf.GameTree[]} data - The data.
   */
  add: function (data) {
    var err;
    if (!data) return;

    if (data === true) { // Create empty gametree with default size 19x19
      data = this.parser.parse('(;SZ[19])', this.keepRaw);
    } else if (typeof data === 'string') {
      data = this.parser.parse(data, this.keepRaw);
    } else if (Array.isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        if (!(data[i] && data[i].nodes && data[i].variations)) {
          err = "Invalid data in array. Expect Array of GameTree objects.";
          break;
        }
      }
    } else if (data.nodes && data.variations) {
      // Assumes this is a GameTree-like object.
      data = [ data ];
    } else {
      err = "Invalid data. Expect string, boolean, Array or GameTree object.";
    }

    if (err) throw new Error(err);

    if (data.length) {
      Array.prototype.push.apply(this.collection, data);
    }
  },
  /**
   * Get a {@link GoSgf.Nav|Nav} instance linked to the gametree at `index`.
   *
   * @param {Number} index - The index of the gametree
   *
   * @returns {?GoSgf.Nav} a newly created {@link GoSgf.Nav} instance, or `null`
   *          if there is no gametree at `index`.
   */
  nav: function (index) {
    index = +index || 0;
    if (index < 0 || index >= this.collection.length) return null;
    return new Nav(this.collection[index]);
  },
  /**
   * Serialize the collection to the SGF format.
   *
   * @returns {string} the serialized collection.
   */
  toSgf: function () {
    return this.collection.map(function (c) {
      return c.toSgf(this.parser.spec);
    }).join('');
  }
};

module.exports = GoSgf;

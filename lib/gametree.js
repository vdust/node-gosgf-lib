/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

/**
 * Callback for the {@link GoSgf.GameTree#walk|GameTree#walk()} method.
 *
 * @callback GoSgf.GameTree~WalkerCallback
 *
 * @param {GoSgf.Spec.Node} node - The node being walked
 * @param {number[]} path - The node path in the gametree.
 *        (see {@link GoSgf.Nav} for details on path format)
 *
 * @returns {?boolean} If the return value is `false`, the walking process is
 *    stopped immediately.
 */

/**
 * Create a new gametree.
 *
 * It is also used for variations.
 *
 * A gametree constains a sequence of nodes, followed by a set of optional
 * variations. A valid gametree **MUST** contain at least one node.
 *
 * @param {?GoSgf.Spec.Node[]} [nodes] - The list of nodes to add to the
 *        gametree.
 * @param {?GoSgf.GameTree[]} [variations] - The list of variations.
 *
 * @alias GoSgf.GameTree
 * @constructor
 */
function GameTree(nodes, variations) {
  /**
   * Nodes
   * A valid gametree **MUST** contain at least one node.
   * @type {GoSgf.Spec.Node[]}
   */
  this.nodes = nodes||[];
  /**
   * Variations
   * @type {GoSgf.GameTree[]}
   */
  this.variations = variations||[];
}

GameTree.prototype = {
  /**
   * Add nodes to the gametree.
   *
   * @param {...GoSgf.Spec.Node} node - Nodes
   */
  addNode: function (node) {
    var args = arguments;
    for (var i = 0; i < args.length; i++) {
      if (args[i]) this.nodes.push(args[i]);
    }
  },
  /**
   * Add gametrees as variations.
   *
   * Invalid variations (i.e. that don't contain at least one node) will be
   * ignored.
   *
   * @param {...GoSgf.GameTree} variation
   */
  addVariation: function (variation) {
    var args = arguments;
    for (var i = 0; i < args.length; i++) {
      variation = args[i];
      if (variation && variation.nodes.length) {
        // A valid gametree contains at least one node
        this.variations.push(variation);
      }
    }
  },
  /**
   * Serialize the gametree as a string
   *
   * @param {!GoSgf.Spec} spec - The specification instance to use to encode
   *        data
   *
   * @returns {string} The serialized gametree
   */
  toSgf: function (spec) {
    return '('
      + this.nodes.map(function (n) { return spec.nodeToString(n); }).join('')
      + this.variations.map(function (gt) { return gt.toSgf(spec); }).join('')
      + ')';
  },
  /**
   * Walk through all nodes and variations in the gametree.
   *
   * Nodes are walked through first, then nodes in each variation, all in
   * the order they are stored in.
   *
   * @param {GoSgf.GameTree~WalkerCallback} callback - The callback to be
   *        called for each node.
   *
   * @returns {?boolean} `true` when all the nodes were walked through,
   *    `false` if the walking process was cancelled by the callback.
   */
  walk: function (callback) {
    // Iterative algorithm, using a stack for variations processing.
    var stack = [ { v: [], gt: this } ],
      cur, gt, i, r;

    while (stack.length) {
      cur = stack.pop();
      gt = cur.gt;

      for (i = 0; i < gt.nodes.length; i++) {
        r = callback(gt.nodes[i], cur.v.concat([i]));
        if (r === false) return r; // walk cancelled.
      }

      // stack variations in reverse order (popped in correct order).
      for (i = gt.variations.length - 1; i >= 0; i--) {
        stack.push({ v: cur.v.concat([i]), gt: gt.variations[i] });
      }
    }

    return true;
  }
}

module.exports = GameTree;

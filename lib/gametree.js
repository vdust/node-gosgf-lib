/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var Spec = require('./spec.js');

/**
 * Callback for the {@link GoSgf.GameTree#walk|GameTree#walk()} method.
 *
 * @callback GoSgf.GameTree~WalkerCallback
 *
 * @param {GoSgf.GameTree.Node} node - The node being walked
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
 * @param {?GoSgf.GameTree.Node[]} [nodes] - The list of nodes to add to the
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
   * @type {GoSgf.GameTree.Node[]}
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
   * @param {...GoSgf.GameTree.Node} node - Nodes
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
  },
  /**
   * Clone the gametree.
   *
   * @param {function} cloneObjects - A function that takes an object as
   *    argument and returns a copy if possible (the passed in object
   *    otherwise)
   *
   * @return {GoSgf.GameTree} A new GameTree instance.
   */
  clone: function (cloneObjects) {
    return new GameTree(this.nodes.map(function (n) {
      return n.clone();
    }), this.variations.map(function (v) {
      return v.clone();
    }));
  }
};


/**
 * Create a Node instance.
 *
 * @param {object} [assign] - An object containing properties to assign on the
 *    node. Thoses properties are assumed to have valid decoded values.
 * @param {boolean} [addRaw=true] - Whether to add the `_raw` property to the
 *    instance.
 *
 * @alias GoSgf.GameTree.Node
 * @constructor
 */
function Node(assign, addRaw) {
  if (typeof assign === 'boolean') {
    addRaw = assign;
    assign = null;
  }

  if (typeof addRaw !== 'boolean' || addRaw) this._raw = {};
  if (assign) Object.assign(this, assign);
}

/**
 * Clone a Node property value.
 *
 * The following types are actually cloned:
 *
 *  - `Array`: Return a new `Array` with cloned elements
 *  - {GoSgf.Spec.Point|`Point`}: Return a new instance
 *  - {GoSgf.Spec.Composed|`Composed`}: Return a new instance with cloned
 *    components
 *
 * Other `object`s are passed to the optional `cloneOther` function.
 *
 * Basic types are returned as is since they are immutable
 *
 * @param {*} v - The value to clone.
 * @param {function} [cloneOther] - A function that takes an `object` as
 * argument and returns a copy of it if possible.
 *
 * @return {*} The cloned value.
 */
Node.cloneValue = function (v, cloneOther) {
  if (Array.isArray(v)) {
    v = v.map(function (x) { return Node.cloneValue(x, cloneOther); });
  } else if (v instanceof Spec.Composed) {
    v = new Spec.Composed(
      Node.cloneValue(v.first, cloneOther),
      Node.cloneValue(v.second, cloneOther));
  } else if (v instanceof Spec.Point) {
    v = new Spec.Point(v.x, v.y);
  } else if (typeof v === 'object' && typeof cloneOther === 'function') {
    v = cloneOther(v);
  }
  // else -> value is immutable

  return v;
}

Node.prototype = {
  /**
   * Clone the node instance.
   *
   * @param {function} [cloneOther] - A function that takes an unknown
   * `object` as an argument and returns a copy if possible.
   *
   * @return {GoSgf.GameTree.Node} A new Node instance with cloned properties.
   */
  clone: function (cloneOther) {
    var n = new Node(),
      k;

    for (k in this) {
      if (k === '_raw' || !this.hasOwnProperty(k)) continue;
      n[k] = Node.cloneValue(this[k], cloneOther);
    }

    if (this._raw) {
      for (k in this._raw) {
        // property values are all arrays of strings.
        if (!this.hasOwnProperty(k)) continue;
        n._raw[k] = this._raw[k].slice();
      }
    } else {
      delete n._raw;
    }

    return n;
  }
};

GameTree.Node = Node;

module.exports = GameTree;

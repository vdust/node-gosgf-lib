/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var Spec = require('./spec.js'),
  hidden = require('./_utils.js').hidden;

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

/**
 * Create a gametree from a JSON representation
 *
 * @param {string|object} json - A JSON string or the parsed object
 *
 * @return {GoSgf.GameTree} A gametree instance
 */
GameTree.fromJSON = function (json) {
  var data = typeof json === 'string' ? JSON.parse(json) : json,
    gt = new GameTree();

  if (data != null) {
    gt.nodes = (data.nodes||[]).map(function (n) {
      return Node.fromJSON(n);
    });
    gt.variations = (data.variations||[]).map(function (gt) {
      return GameTree.fromJSON(gt);
    });
  }
  return gt;
};

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
 * Normalize node properties values.
 *
 * value processing is as follow, depending of the value type:
 *   - `null` is preserved and `undefined` are normalized to `null`
 *   - An array (`Array.isArray(value) === true`) gets each elements normalized
 *     in place
 *   - An `object` with 'x' and 'y' properties is converted to a `Point` instance
 *   - An `object` with 'first' and 'second' properties is converted to a
 *     `Composed` instance
 *   - Any other `object` (`typeof value === 'object'`) issues a warning and is
 *     returned unchanged (thoses normally don't occur in node properties)
 *   - Any other type (`typeof value !== 'object'`) is returned unchanged
 *
 * @param {*} value - The value to normalize
 *
 * @return {*} The normalized value. If value is an array, each element is
 *    normalized in place
 */
Node.normalizeValue = function (value) {
  if (value == null) {
    value = null; // normalize undefined to null
  } else if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      value[i] = Node.normalizeValue(value[i]);
    }
  } else if (typeof value === 'object') {
    if ('x' in value && 'y' in value) { // Should be a point
      value = new Spec.Point(value.x, value.y);
    } else if ('first' in value && 'second' in value) { // Should be a composed type
      value = new Spec.Composed(
        Node.normalizeValue(value.first),
        Node.normalizeValue(value.second));
    } else {
      console.warn("Unable to detect value type. Value preserved as native Object.");
    }
  }

  return value;
};

/**
 * Create a Node from a JSON string
 *
 * @param {string|object} json - A JSON string or the parsed object
 *
 * @return {GoSgf.GameTree.Node} A node instance
 */
Node.fromJSON = function (json) {
  var node = new Node(false),
    data = typeof json === 'string' ? JSON.parse(json) : json,
    k;

  if (data != null) {
    for (k in data) {
      if (!data.hasOwnProperty(k)) continue;
      node[k] = k === '_raw' ? data[k] : Node.normalizeValue(data[k]);
    }
  }

  return node;
};

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
  },
  /**
   * Get Node type.
   *
   * The node type is determined by properties defined on the node.
   * The first deterministic property defines the type of node. If no property
   * is found that allows for type determination, defaults to .
   *
   * @return {string} `undefined`, `root`, `setup` or `move`
   */
  getType: function (clearCache) {
    var self = this,
      type = 'undefined',
      types, t, props, i;

    if (self._type && !clearCache) {
      return self._type;
    }

    types = [ 'move', 'setup', 'root' ];

    while (types && types.length) {
      t = types.pop();
      props = Spec.prototype[t.toUpperCase()];
      for (i = 0; i < props.length; i++) {
        if (self.hasOwnProperty(props[i])) {
          type = t;
          types = false;
          break;
        }
      }
    }

    hidden(self, '_type', type, true, false);

    return self._type;
  }
};

GameTree.Node = Node;

module.exports = GameTree;

/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var Board = require('./board.js'),
  GameTree = require('./gametree.js'),
  property = require('./_utils.js').property;

/**
 * An array describing a node path in a gametree
 * @typedef {number[]} GoSgf.Nav~Path
 *
 * Each number in the array describes the variation index in the previous
 * variation, except the last, which is the node index.
 *
 * **Examples**:
 *
 * `[0, 1, 10]` is the path to the 11th node of the 2nd variation in the first
 * main variation.
 *
 * `[0]` represents the root node of a gametree.
 */

/**
 * Create a Nav instance.
 *
 * Used to navigate through nodes in a gametree.
 *
 * @param {goSgf.GameTree} gametree - The gametree to browse through this
 *        instance.
 *
 * @alias GoSgf.Nav
 * @constructor
 */
function Nav(gametree) {
  var self = this;

  self._gametree = gametree;
  self._board = null; // board initialized on demand
  self._cursor = [0];

  /**
   * Get the board instance owned by this Nav instance.
   *
   * The board is lazily created the first time it is requested.
   *
   * Navigation the gametree after calling this method will automatically
   * update the board state. To prevent that, one should use a copy of the Nav
   * which won't be linked to this board. (and can create its own board on
   * demand)
   *
   * @name GoSgf.Nav#board
   * @type {GoSgf.Board}
   */
  property(self, 'board', function () {
    if (!self._board) {
      self._board = new Board();
      self._board.queueRender(self);
    }
    return self._board;
  });

  /**
   * Get the current path.
   *
   * The returned array must be considered read-only and is not to be modified.
   * Updating the nav path won't change previously obtained path objects.
   *
   * @name GoSgf.Nav#path
   * @type {GoSgf.Nav~Path}
   * @readonly
   */
  property(self, 'path', function () {
    return self._cursor;
  });

  /**
   * Get the root node of the underlying gametree
   *
   * @name GoSgf.Nav#root
   * @type {?GoSgf.GameTree.Node}
   */
  property(self, 'root', function () {
    var gt = self._gametree;
    return (gt || null) && gt.nodes[0];
  });
}

Nav.prototype = {
  /**
   * Copy this instance.
   *
   * The new instance will be linked to the same gametree and will point to the
   * same path. Navigating through the copy won't modify the copied instance's
   * board state.
   *
   * @returns {GoSgf.Nav} A newly created Nav instance set to point the current
   *          path.
   */
  copy: function () {
    var nav = new Nav(this._gametree);

    nav.update(this._cursor);
    nav._length = this._length; // propagate cached length

    return nav;
  },
  /**
   * Update the gametree path cursor.
   *
   * The new cursor path is lazily queued for rendering on the owned board.
   * Also clear cached data related to the previous path.
   *
   * If no `path` is provided, simply queue the current path for rendering and
   * clear cached data.
   *
   * @param {GoSgf.Nav~Path} [path] - The path to update the cursor to.
   *
   * @returns {boolean} `true` if the path was updated successfully, `false`
   *   otherwise.
   */
  update: function (path) {
    if (path) {
      if (!this.get(path)) return false;
      this._cursor = path.slice(0);
    }

    if (this._board) this._board.queueRender(this); // lazy updates

    delete this._length; // Remove cached length if any.

    return true;
  },

  /**
   * Move to a specific path.
   *
   * Same as {@link #update|this.update()}, except it also accepts path as
   * strings for relative lookup.
   *
   * Possible `path` string values:
   * - `first` or `root`: Move to the root node (same as
   *   {@link #first|this.first()})
   * - `prev`: Move to the previous node (same as {@link #prev|this.prev()})
   * - `next`: Move to the next node (same as {@link #next|this.next()})
   * - `last`: Move to the last node (same as {@link #last|this.last()})
   * - `@first`: Move to the first sibling variation (same as
   *   {@link #variation|this.variation(0)})
   * - `@next`: Move to the next sibling variation (same as
   *   {@link #nextVariation|this.nextVariation()})
   * - `@prev`: Move to the previous sibling variation (same as
   *   {@link #prevVariation|this.nextVariation()})
   * - `@last`: Move to the last sibling variation (same as
   *   {@link #variation|this.variation(-1)})
   * - `@>`: Cycle through variations (same as
   *   {@link #cycleVariation|this.cycleVariation()})
   * - `@<`: Cycle through variations in reverse order (same as
   *   {@link #cycleVariation|this.cycleVariation(true)})
   *
   * @param {GoSgf.Nav~Path|string} path - The path to move to. Can be an alias
   *    string for relative navigation (see above).
   *
   * @returns {boolean} `true` on success, `false` otherwise.
   */
  moveTo: function (path) {
    if (!Array.isArray(path)) {
      if (path === 'root' || path === 'first') {
        path = [0];
      } else if (path === 'prev') {
        return this.prev();
      } else if (path === 'next') {
        return this.next();
      } else if (path === 'last') {
        return this.last();
      } else if (path === '@first') {
        return this.variation(0);
      } else if (path === '@prev') {
        return this.prevVariation();
      } else if (path === '@next') {
        return this.nextVariation();
      } else if (path === '@last') {
        return this.variation(-1);
      } else if (path === '@>' || path === '@<') {
        return this.cycleVariation(path === '@<');
      } else return false; // Invalid path definition
    }
    return this.update(path);
  },
  /**
   * Move to the root node.
   *
   * @returns {boolean} `true` on success, `false` otherwise (should never
   *    occur on a valid gametree).
   */
  first: function () {
    return this.update([0]);
  },
  /**
   * Move to the previous node.
   *
   * @returns {boolean} `true` on success, `false` otherwise (root node has no
   * previous node).
   */
  prev: function () {
    var cursor = this._cursor,
        node = cursor[cursor.length - 1] - 1,
        variation;

    if (node < 0) {
      if (cursor.length == 1) return false;
      variation = cursor.slice(0, -2);
      variation.push(0);
      variation = this._getVariation(variation);
      if (!variation[0]) return false;
      cursor = cursor.slice(0, -2);
      cursor.push(variation[0].nodes.length - 1);
    } else {
      cursor = cursor.slice(0, -1);
      cursor.push(node);
    }

    this._cursor = cursor;

    return this.update();
  },
  /**
   * Move to the next node.
   *
   * If the current cursor points to the last node in the current variation,
   * the cursor will be moved to the first node of the first children
   * variation, if any.
   *
   * @returns {boolean} `true` on success, `false` otherwise (last node and no
   * child variation).
   */
  next: function () {
    var variation = this._getVariation(),
      node = variation[1],
      cursor = this._cursor;

    variation = variation[0];

    if (!variation) return false; // error

    cursor = cursor.slice(0, -1);

    if (variation.nodes[++node]) {
      cursor.push(node);
    } else if (variation.variations[0]) {
      cursor.push(0, 0);
    } else return false;

    this._cursor = cursor;

    return this.update();
  },
  /**
   * Move to the first terminal node from the current path.
   *
   * The cursor is moved through the first variations from the current cursor.
   *
   * @return {boolean} `true`.
   */
  last: function () {
    // go to last node through first variations form the current node.
    var cursor = this._cursor,
        v = this._getVariation(),
        n = v[1],
        variation = v[0];

    if (!variation.variations.length && n === (variation.nodes.length - 1)) {
      // Already the last. Do nothing (no board update), success.
      return true;
    }

    cursor = cursor.slice(0, -1);

    while (variation.variations.length) {
      cursor.push(0);
      variation = variation.variations[0];
    }
    cursor.push(variation.nodes.length - 1);

    this._cursor = cursor;

    return this.update();
  },
  /**
   * Get the current variation or move to a specific variation.
   *
   * If `nvar` is set, the current node must have variations, i.e. the path
   * must point to the first node of a variation. (Any other node has no
   * siblings)
   *
   * @param {number} [nvar] - The index of the variation. If negative, variations
   *    are counted from last.
   *
   * @returns {boolean} If `nvar` is not set, returns the current variation
   *   index (always `0` if the cursor is not on the first node of a
   *   variation). If `nvar` is set, returns `true` on success, `false`
   *   otherwise (no siblings or index out of range).
   */
  variation: function (nvar) {
    var cursor = this._cursor,
      nIdx = cursor[cursor.length - 1],
      variation;

    if (arguments.length === 0) {
      return (nIdx || cursor.length === 1) ? 0 : cursor[cursor.length - 2];
    }

    variation = this._getVariation(cursor.slice(0, -1));

    if (!variation[0] || nIdx) return false;
    nvar = +nvar
    if (isNaN(nvar)) return false;
    if (nvar < 0) { // count from last (= -1)
      nvar = variation[0].variations.length + nvar;
    }
    if (!(nvar >= 0 && nvar < variation[0].variations.length)) return false;

    this._cursor = cursor = cursor.slice();
    cursor[cursor.length - 2] = nvar;

    return this.update();
  },
  /**
   * Move to the previous variation.
   *
   * @returns {boolean} `true` on success, `false` otherwise.
   */
  prevVariation: function () {
    var v = this.variation();
    // Must check v == 0 because this.variation(-1) set to last variation.
    return v > 0 ? this.variation(v - 1) : false;
  },
  /**
   * Move to the next variation.
   *
   * @returns {boolean} `true` on success, `false` otherwise.
   */
  nextVariation: function () {
    return this.variation(this.variation() + 1);
  },
  /**
   * Cycle through variations of the current node.
   *
   * Always succeed, whatever the node.
   *
   * @param {boolean} [reverse=false] Whether to cycle variations in reverse
   *    order.
   *
   * @returns {booleab} Always `true`
   */
  cycleVariation: function (reverse) {
    var v = this.variation(),
        dir = reverse ? -1 : 1;

    if (!this.variation(v + dir)) {
      // case when v + 1 == variations count : cycle to first variation.
      if (v !== 0) this.variation(0);
    }

    return true; // Always succeed (non-0 nodes cycle on themselves).
  },

  /**
   * Get the {@link GoSgf.GameTree.Node|Node} instance at `path`. If `path` not
   * set or `null`, get the node at the current path.
   *
   * @param {?GoSgf.Nav~Path} path - A node path
   *
   * @returns {?GoSgf.GameTree.Node} A node instance, or null if the path is
   *    invalid.
   */
  get: function (path) {
    var variation = this._getVariation(path);
    return variation[0] ? variation[0].nodes[variation[1]] : null;
  },
  /**
   * Get the nodes along the current path.
   *
   * @param {GoSgf.Nav|GoSgf.Nav~Path} fromPath - If set, limit the result to
   *    the node following fromPath.
   *
   * @returns {GoSgf.GameTree.Node[]} The array of nodes. If `fromPath` is set
   *    and is not an ascendant of the current path, the returned array is
   *    empty.
   */
  getNodes: function (fromPath) {
    var self = this,
      variation = self._gametree,
      path = self._cursor,
      nodes = [],
      append = nodes.push.apply.bind(nodes.push, nodes),
      i, fpl;

    if (fromPath) {
      // check that fromPath is an ascendant path
      fromPath = self._checkNavPath(fromPath);
      if (!fromPath) return nodes;
      if (!(self._comparePaths(self._cursor, fromPath) > 0)) {
        return nodes; // not related or beyond cursor => no nodes
      }
    } else {
      fromPath = [-1];
    }

    fpl = fromPath.length - 1;
    for (i = 0; variation && i < path.length - 1; i++) {
      if (i === fpl) {
        append(variation.nodes.slice(fromPath[i]+1));
      } else if (i > fpl) {
        append(variation.nodes);
      }
      variation = variation.variations[path[i]];
    }
    append(variation.nodes.slice(i == fpl ? fromPath[i] + 1 : 0, path[i] + 1));
    return nodes;
  },

  /**
   * Get the length of the current path (number of nodes from the root).
   *
   * @returns {number} The length of the path.
   */
  length: function () {
    if (this._length != null) return this._length;

    var variation = this._gametree,
        path = this._cursor,
        l = 0, i;

    for (i = 0; variation && i < path.length - 1; i++) {
      l += variation.nodes.length;
      variation = variation.variations[path[i]];
    }

    return (this._length = (l + path[i] + 1));
  },
  /**
   * Get the number of variations for the current node.
   *
   * @returns {number} The number of variations. `1` means the node has no
   *    variations.
   */
  variationsCount: function () {
    var variation, l,
      c = this._cursor,
      cl = c.length;

    if (cl === 1 && c[0] === 0) return 1;

    variation = this._getVariation(this._cursor.slice(0, -1));

    if (!variation[0]) return false; // false means _cursor is not a valid path
    l = (variation[0].variations||[]).length;

    return (!c[cl-1] && l > 0) ? l : 1;
  },

  /**
   * Check whether the nav cursor points to a given path.
   *
   * @param {GoSgf.Nav~Path} path - The path to compare to
   *
   * @returns {boolean} `true` if the cursor is on `path`.
   */
  isPath: function (path) {
    return this._comparePaths(this._cursor, path) === 0;
  },
  /**
   * Check whether the nav cursor points to the root node.
   *
   * @returns {boolean} `true` if the cursor is on the root node.
   */
  isRoot: function () {
    var c = this._cursor;
    return c.length === 1 && c[0] === 0;
  },
  /**
   * Check if the current node has variations.
   *
   * @returns {boolean} `true` if variations exist, `false` otherwise.
   */
  hasVariations: function () {
    return this.variationsCount() > 1;
  },

  /**
   * Check if a path is an ascendant of the current cursor.
   *
   * @param {GoSgf.Nav|GoSgf.Nav~Path} path - The path to test
   * @param {boolean} [orSelf] - Whether to consider the current path as an
   *    ascendant of itself.
   *
   * @returns {boolean} `true` if `path` is an ascendant of the cursor,
   *    `false` otherwise.
   */
  ascendantOf: function (path, orSelf) {
    var res;

    path = this._checkNavPath(path);
    if (!path) return false;

    res = this._comparePaths(this._cursor, path);
    if (res == null) return false;
    return res < 0 || (orSelf && !res);
  },
  /**
   * Check if a path is a descendant of the current cursor.
   *
   * @param {GoSgf.Nav|GoSgf.Nav~Path} path - The path to test.
   * @param {boolean} [orSelf] - Whether to consider the current path as a
   *    descendant of itself.
   *
   * @returns {boolean} `true` if `path` is a descendant of the cursor,
   *    `false` otherwise.
   */
  descendantOf: function (path, orSelf) {
    var res;

    path = this._checkNavPath(path);
    if (!path) return false;

    res = this._comparePaths(this._cursor, path);
    if (res == null) return false;
    return res > 0 || !!(orSelf && res);
  },
  /**
   * Check if a path is an ascendant or a descendant of the current cursor.
   *
   * @param {GoSgf.Nav|GoSgf.Nav~Path} path - The path to test
   *
   * @returns {boolean} `true` if paths are related, `false` otherwise.
   */
  relatedTo: function (path) {
    path = this._checkNavPath(path);
    if (!path) return false;
    return this._comparePaths(this._cursor, path) != null;
  },

  /**
   * Get the current board state as a single-node gametree.
   *
   * @see GoSgf.Board#renderToNode
   *
   * @returns {GoSgf.GameTree} A gametree containing a single node with the
   *    properties required to represent the current board state.
   */
  flatten: function () {
    return new GameTree([ this.board().renderToNode() ]);
  },
  /**
   * Find the path of a node instance.
   * 
   * Nodes are compared using `===`, so it will only find a match if the
   * instance is the same.
   *
   * @returns {?GoSgf.Nav~Path} The path of the node, or `null` if the node was
   *    not found in the gametree.
   */
  getNodePath: function (node) {
    var path = null;
    this.walk(function (n, p) {
      if (n === node) {
        path = p;
        return false;
      }
    });
    return path;
  },

  /**
   * Walk through nodes in the gametree linked to this instance.
   *
   * @param {GoSgf.GameTree~WalkerCallback} callback - The function to call for
   *    each node.
   *
   * @see GoSgf.GameTree#walk
   */
  walk: function (callback) {
    return this._gametree.walk(callback);
  },

  /**
   * Get variation informations for a path.
   *
   * @param {GoSgf.Nav~Path} [path] - A path
   *
   * @returns {GoSgf.Nav~VariationInfos} the variation informations.
   *
   * @private
   */
  _getVariation: function (path) {
    var variation = this._gametree,
        path = path || this._cursor;

    for (var i = 0; variation && i < path.length - 1; i++) {
      variation = variation.variations[path[i]];
    }

    return [variation, path[i]];
  },
  /**
   * Check if an object is a valid Path descriptor.
   *
   * **TODO**: better describe handling of GoSgf.Nav instances.
   *
   * @param {GoSgf.Nav|GoSgf.Nav~Path} path - the nav or path to check
   *
   * @returns {GoSgf.Nav~Path} `path` if it is a `GoSgf.Nav~Path` instance,
   *    `path._cursor` if `path` is a `GoSgf.Nav` instance.
   */
  _checkNavPath: function (path) {
    if (path && path._cursor) {
      if (path._gametree !== this._gametree) {
        // not the same gametree => path not valid
      }
      return path._cursor;
    } else if (Array.isArray(path)) {
      // check the node actually exists
      if (!this.get(path)) return false;
    } else {
      throw new Error("Instance must be a Nav instance or a path (array of integers).");
    }
    return path;
  },
  /**
   * Compare two path.
   *
   * @param {GoSgf.Nav~Path} path1 - a path
   * @param {GoSgf.Nav~Path} path2 - another path
   *
   * @returns {?number} `-1` if `path1` is an ascendant of `path2`, `0` if paths
   * are equal or `1` if `path1` is a descendant of `path2`. If paths are not
   * related, returns `undefined`.
   */
  _comparePaths: function (path1, path2, _dir) {
    var l1 = path1.length, l2 = path2.length;

    if (l1 < l2) return this._comparePaths(path2, path1, -1);

    for (var i = 0; i < l2 - 1; i++) {
      if (path1[i] != path2[i]) {
        // paths not related => can't compare them
        return; // undefined
      }
    }

    if (l1 === l2 && path1[i] === path2[i]) return 0;

    return (l1 > l2 || path1[i] > path2[i]) ? (_dir || 1) : (-_dir || -1);
  }
};

module.exports = Nav;

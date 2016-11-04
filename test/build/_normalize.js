/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var GoSgf = require('../../lib/gosgf.js');

module.exports = {
  board: normalizeBoard,
  gametree: normalizeGametree,
  gametrees: normalizeGametrees,
  node: normalizeNode,
  nodeinfo: normalizeNodeInfo,
  nodes: normalizeNodes,
  value: normalizeValue
};

/**
 * Normalize board.
 *
 * Convert object describing intersections to Intersections instances.
 *
 * @param {Array} board - An array describing board instersections data
 * @param {object} [options] - Options to modify normalization behaviour
 * @param {boolean} options.keepRaw - Whether to keep `_raw` property on nodes
 *
 * @return {GoSgf.Board.Intersection[]}
 *
 * @alias Tests.normalize.board
 */
function normalizeBoard(board, options) {
  var i, itn;

  if (!board) return board;

  for (i = 0; i < board.length; i++) {
    board[i] = Object.assign(new (GoSgf.Board.Intersection)(), board[i]);
  }

  return board;
}

/**
 * Normalize a gametree.
 *
 * @param {object} obj - An object describing a gametree
 * @param {object} [options] - Options to modify normalization behaviour
 * @param {boolean} options.keepRaw - Whether to keep `_raw` property on nodes
 *
 * @return {GoSgf.GameTree} A GameTree instance.
 *
 * @alias Tests.normalize.gametree
 */
function normalizeGametree(obj, options) {
  return new (GoSgf.GameTree)(
    normalizeNodes(obj.nodes || [ {} ], options),
    normalizeGametrees(obj.variations || [], options)
  );
}

/**
 * Normalize gametrees.
 *
 * Convert common objects to corresponding `GoSgf.*` classes.
 * 
 * Array elements are modified in-place.
 *
 * This step is required in order to use `expect.toEqual()`, which compares
 * constructors as well.
 *
 * @param {Array} gametrees - An array of objects describing gametrees
 * @param {object} [options] - Options to modify normalization behaviour
 * @param {boolean} options.keepRaw - Whether to keep `_raw` property on nodes
 *
 * @return {GoSgf.GameTree[]} Array of gametrees.
 *
 * @alias Tests.normalize.gametrees
 */
function normalizeGametrees(gametrees, options) {
  if (!gametrees) return gametrees;

  for (var i = 0; i < gametrees.length; i++) {
    gametrees[i] = normalizeGametree(gametrees[i], options);
  }

  return gametrees;
}

/**
 * Normalize an array of objects.
 *
 * Array elements modified in place.
 *
 * @param {object[]} array - The array of objects describing nodes
 * @param {object} [options] - Options to modify normalization behaviour
 * @param {boolean} options.keepRaw - Whether to keep `_raw` property on nodes
 *
 * @return {GoSgf.GameTree.Node[]} An array of normalized nodes.
 *
 * @alias Tests.normalize.nodes
 */
function normalizeNodes(array, options) {
  if (!array) return array;

  for (var i = 0; i < array.length; i++) {
    array[i] = normalizeNode(array[i], options);
  }
  return array;
}

/**
 * Normalize an object to a node instance.
 * 
 * @param {object} obj - An object
 * @param {object} [options] - Options to modify normalization behaviour
 * @param {boolean} options.keepRaw - Whether to keep `_raw` property on nodes
 *
 * @return {GoSgf.GameTree.Node} A newly created Node instance.
 *
 * @alias Tests.normalize.node
 */
function normalizeNode(obj, options) {
  var node;

  if (!obj) return obj;

  node = new (GoSgf.GameTree.Node)();

  for (var k in obj) {
    if (k === '_raw') continue;
    node[k] = normalizeValue(obj[k], Object.assign({ key: k }, options || {}));
  }

  if (!options.keepRaw) delete node._raw;

  return node;
}

/**
 * Normalize a NodeInfo object
 *
 * @param {object} obj - An object representing a NodeInfo object
 * @param {object} [options] - Options to modify normalization behaviour
 * @param {boolean} options.keepRaw - Whether to keep `_raw` property on nodes
 *
 * @return {GoSgf.Nav~NodeInfo} A newly created Node instance.
 *
 * @alias Tests.normalize.nodeinfo
 */
function normalizeNodeInfo(obj, options) {
  var o = {};
  if (obj.path) o.path = obj.path;
  if (obj.node) o.node = normalizeNode(obj.node, options || {});
  return o;
}

/**
 * Normalize a property value
 *
 * In the case of arrays, elements are normalized in place.
 *
 * @param {*} value - Value to normalize
 * @param {object} [options] - Options to modify normalization behaviour
 * @param {string} options.key - A name used in error messages while normalizing
 *
 * @returns {*} The normalized value
 *
 * @alias Tests.normalize.value
 */
function normalizeValue(value, options) {
  var key = options.key || '';

  if (!value) return value;

  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      value[i] = normalizeValue(value[i], { key: key+'['+i+']' });
    }
  } else if (typeof value === 'object') {
    if ('x' in value && 'y' in value) { // Should be a point
      value = new (GoSgf.Spec.Point)(value.x, value.y);
    } else if ('first' in value && 'second' in value) { // Should be a composed type
      value = new (GoSgf.Spec.Composed)(
        normalizeValue(value.first, key+'.first'),
        normalizeValue(value.second, key+'.second'));
    } else {
      console.log((key ? key + ": " : "")
        + "Unable to detect value format. Value preserved as native Object.");
    }
  }
  return value;
}

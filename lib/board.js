/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var Intersection = require('./intersection.js'),
  Spec = require('./spec.js'),
  Node = require('./gametree.js').Node,
  _utils = require('./_utils.js'),
  property = _utils.property,
  hidden = _utils.hidden,
  IPROPS = Spec.prototype.INFO_MAP;

/**
 * Create a rectangle instance.
 *
 * @param {number} x - The x coordinate of the top-left intersection
 * @param {number} y - The y coordinate of the top-left intersection
 * @param {number} width - The width of the rectangle
 * @param {number} height - The height of the rectangle
 *
 * @alias GoSgf.Board.Rect
 * @constructor
 */
function Rect(x, y, width, height) {
  /**
   * The x coordinate of the top-left intersection
   * @type {number}
   */
  this.x = x;
  /**
   * The y coordinate of the top-left intersection
   * @type {number}
   */
  this.y = y;
  /**
   * The width of the rectangle
   * @type {number}
   */
  this.width = width;
  /**
   * The height of the rectangle
   * @type {number}
   */
  this.height = height;
}
/**
 * Get rectangle parameters as an array.
 *
 * @returns {number[]} `[x, y, width, height]`
 */
Rect.prototype.toArray = function () {
  return [ this.x, this.y, this.width, this.height ];
};


/**
 * Object describing the size of a board.
 * @typedef {Object} GoSgf.Board~Size
 * @property {number} width - The width of the board.
 * @property {number} height - The height of the board.
 */

/**
 * Array containing board data.
 * @typedef {GoSgf.Board.Intersection[]} GoSgf.Board~BoardData
 * @property {number} width - The width of the board.
 * @property {number} height - The height of the board.
 */

/**
 * The Board class.
 *
 * @param {GoSgf.Nav} [nav] - A nav instance to queue for initial rendering.
 *
 * @alias GoSgf.Board
 * @constructor
 */
function Board(nav) {
  var self = this;

  /**
   * Markup data for last move, to be merged in corresponding intersection.
   * The object can be edited to alter the properties to set as markup.
   * @type {Object}
   * @name GoSgf.Board#lastMoveMark
   */
  self.lastMoveMark = { last: true };
  /**
   * Next player color, processed from rendered nodes.
   * @name GoSgf.Board#nexPlayer
   * @type {number}
   */
  self.nextPlayer = self.BLACK;
  /**
   * The size of the board.
   *
   * If the position could not be setup, the property returns null.
   *
   * @type {?GoSgf.Board~Size}
   * @readonly
   */
  property(self, 'size', function () {
    return (this._updateState() || null) && {
      width: this._size[0],
      height: this._size[1]
    };
  });
  /**
   * The board array.
   *
   * Null if position could not be set.
   *
   * @type {?GoSgf.Board~BoardData}
   */
  property(self, 'board', function () {
    return ( this._updateState() && this._board ) || null;
  });
  /**
   * An object containing informations about the game and board position.
   *
   * The returned object is the object owned by the board instance. Any
   * modification to the board state through `this.queueRender()` will modify
   * the object in place.
   *
   * Null if position could not be set.
   *
   * @type {?GoSgf.Board~BoardInfos}
   */
  property(self, 'infos', function () {
    return ( this._updateState() && this._infos ) || null;
  });

  if (nav) self.queueRender(nav);
}

Board.Rect = Rect;
Board.Intersection = Intersection;

Board.prototype = {
  /**
   * Constant for empty intersection
   * @const {number}
   * @readonly
   */
  NONE: Intersection.NONE,
  /**
   * Constant for Black move
   * @const {number}
   * @readonly
   */
  BLACK: Intersection.BLACK,
  /**
   * Constant for White move
   * @const {number}
   * @readonly
   */
  WHITE: Intersection.WHITE,
  /**
   * Queue a nav cursor for rendering.
   *
   * The board is actually rendered when board data is requested.
   *
   * @param {GoSgf.Nav} nav - A nav instance pointing to the path to render.
   * @param {boolean} forceClear - Force a reset of the board state.
   */
  queueRender: function (nav, forceClear) {
    this._queuedRender = nav.copy();
    if (forceClear) delete this._rendered
  },
  /**
   * Obtain data for a given intersection.
   *
   * @param {Number|GoSgf.Spec.Point} x - The horizontal coordinate of the
   *    intersection. If `y` is undefined, `x` is the combined index
   *    (`x + width * y`).
   *
   * @param {Number} [y] - The vertical coordinate.
   *                    
   * @returns {?GoSgf.Board.Intersection} A clone of the intersection.
   */
  get: function (x, y) {
    var itn, sz;

    if (!this._updateState()) return;

    sz = this._size;

    if (typeof x === 'object') {
      y = x.y;
      x = x.x;
    }

    x = +x;
    if (y != null) {
      y = +y;
      if (!(x >= 0 && x < sz[0]) || !(y >= 0 && y < sz[1])) return;
      x += sz[0] * y;
    }

    itn = this._board[x];

    return itn && itn.clone();
  },
  /**
   * Reset rendered state to an empty board.
   *
   * *Note*: No implicit rendering or queueing is done here. Any pending
   * rendering will be processed when accessing board data.
   *
   * @param {?GoSgf.Nav} [nav=null] - A nav instance to use to initialize the
   *        size of the board.
   *
   * @returns {boolean} `true` if the board was successfully cleared, `false`
   * otherwise (board size could not be determined).
   */
  clear: function (nav) {
    var self = this,
      rendered = self._rendered,
      board = self._board,
      infos = self._infos,
      sz, i;

    if (!nav && !rendered) return false;

    if (!board) {
      board = [];
    } else {
      board.splice(0);
    }
    self._board = board;

    sz = rendered && self._size;
    if (!sz) {
      sz = (nav || rendered).root.SZ;
      if (sz) sz = sz.slice(); else sz = [ 19, 19 ];
      self._size = sz;
    }
    hidden(board, 'width', sz[0], true);
    hidden(board, 'height', sz[1], true);
    sz = sz[0] * sz[1];
    for (i = 0; i < sz; i++) board.push(new Intersection());
    self._hidden = [];
    self._captured = [0, 0, 0];
    self.nextPlayer = self.BLACK;
    self._rendered = self.lastMove = null;

    if (!infos) {
      infos = self._infos = {};
    } else {
      // Preserve object instance if it exists.
      for (var k in infos) {
        if (infos.hasOwnProperty(k)) delete infos[k];
      }
    }

    return true;
  },
  /**
   * Get the stones captured by the given player.
   *
   * @param {?number} color - The color of the player.
   *        ({@link Board#BLACK} or {@link Board#WHITE})
   *
   * @returns {number|GoSgf.Board~CapturedBy} The number of stones captured by
   *    `color` or an object containing captured stones by black and white if
   *    `color` is not set.
   */
  capturedBy: function (color) {
    if (!this._updateState()) return null;

    var captured = this._captured || [ 0, 0, 0 ];

    return color ? captured[Intersection.not(color)] : {
      black: captured[Intersection.WHITE] || 0,
      white: captured[Intersection.BLACK] || 0
    };
  },
  /**
   * Get the smallest rectangle area containing all visible intersections.
   *
   * This method processes the latest VW property set in the rendered path,
   * the default being to render the full board.
   *
   * @returns {GoSgf.Board.Rect} the visible rectangle.
   */
  visibleBox: function () {
    if (!this._updateState()) return;

    var self = this,
      bs = self._size,
      w = bs[0], h = bs[1],
      mx = w, my = h,
      Mx = 0, My = 0,
      i, j;

    for (j = 0; j <h; j++) {
      for (i = 0; i < w; i++) {
        if (!self._board[i + j * w].hidden) {
          mx = min(mx, i);
          Mx = max(Mx, i);
          my = min(my, j);
          My = max(My, j);
        }
      }
    }

    // All intersections hidden ? Fallback to all visible.
    if (Mx < mx) mx = my = 0, Mx = w - 1, My = h - 1;

    return new Rect(mx, my, Mx - mx + 1, My - my + 1);
  },
  /**
   * Refresh the board position explicitly (do nothing if already up-to-date).
   *
   * @returns {boolean} true if the board position could be refreshed, false
   * otherwise.
   */
  render: function () {
    return this._updateState();
  },
  /**
   * Generate a single node with current board position.
   *
   * Moves are recorded using setup properties (AB, AE and AW). Markup, View,
   * node infos and game infos properties are also saved in the node.
   *
   * *Note*: Last move information is lost in the process of generating the
   * node.
   *
   * **Warning**: Point instances added to properties must be considered
   * immutable (e.g. Point#x and Point#y must not be modified in place) becayse
   * they might be shared by several properties (reduced memory footprint a
   * bit).
   *
   * *Note*: Figure (FG) is not supported at this moment.
   *
   * @returns {Object} A node instance.
   */
  renderToNode: function () {
    if (!this._updateState()) return;

    var self = this,
      node = new Node(),
      sz = self._size,
      board = self._board,
      def,
      MARKS = self.MARKS,
      vw = [],
      itn, i, j, m, p, mark, label, props, prop, hasHidden;

    node.FF = 4; // spec version
    node.CA = 'utf8';
    node.GM = 1; // game mode (1 = Go)
    node.SZ = sz.concat([]);

    for (i in IPROPS) {
      if (!IPROPS.hasOwnProperty(i)) continue;
      if (i in self._infos) node[IPROPS[i].p] = self._infos[k];
    }

    for (j = 0; i < sz[1]; j++) {
      for (i = 0; i < sz[0]; i++) {
        itn = board[i + sz[0] * j];
        props = [];
        label = null;
        p = new Spec.Point(i, j);
        mark = itn.mark;

        if (itn.color !== NONE) {
          props.push({ k: itn.color === itn.BLACK ? 'AB' : 'AW', v: p });
        }

        if (mark) {
          for (m = 0; m < MARKS.length; m++) {
            def = MARKS[m];
            if (def.mark.dimmed && mark.dimmed) {
              props.push({ k: def.p, v: p});
            } else if (def.composed && mark.label) {
              props.push({ k: def.p, v: new Spec.Composed(p, mark.label) });
            } else if (def.mark.type === mark.type) {
              props.push({ k: def.p, v: p});
            }
          }
        }

        if (itn.hidden) hasHidden = true; else vw.push(p);

        for (p = 0; p < props.length; p++) {
          prop = props[p];
          if (!(prop.k in node)) node[prop.k] = [];
          node[prop.k].push(prop.v);
        }
      }
    }

    if (hasHidden) node.VW = vw; // board partially visible

    node.PL = self.nextPlayer;

    return node;
  },

  /**
   * Definitions of markup properties.
   */
  MARKS: [
    { p: 'DD', mark: { dimmed: true } },
    { p: 'LB', mark: {}, composed: true }, //special case
    // Following marks are mutually explusive
    { p: 'CR', mark: { type: 'circle' } },
    { p: 'MA', mark: { type: 'cross' } },
    { p: 'SL', mark: { type: 'selected' } },
    { p: 'SQ', mark: { type: 'square' } },
    { p: 'TR', mark: { type: 'triangle' } }
  ],

  /**
   * Alias for game infos and node infos properties.
   */
  INFO_PROPERTIES: [
    { p: 'AN', k: 'annotator' },
    { p: 'BR', k: 'blackrank' },
    { p: 'BT', k: 'blackteam' },
    { p: 'CP', k: 'copy' },
    { p: 'DT', k: 'date' },
    { p: 'EV', k: 'event' },
    { p: 'GC', k: 'gamecomment' },
    { p: 'ON', k: 'opening' },
    { p: 'OT', k: 'overtime' },
    { p: 'PB', k: 'blackplayer' },
    { p: 'PC', k: 'location' },
    { p: 'PW', k: 'whiteplayer' },
    { p: 'RE', k: 'result' },
    { p: 'RO', k: 'round' },
    { p: 'RU', k: 'rules' },
    { p: 'SO', k: 'source' },
    { p: 'TM', k: 'maintime' },
    { p: 'US', k: 'user' },
    { p: 'WR', k: 'whiterank' },
    { p: 'WT', k: 'whiteteam' },
    { p: 'HA', k: 'handicap' },
    { p: 'KM', k: 'komi' },
    { p: 'C', k: 'nodecomment', clear: 1 },
    { p: 'BL', k: 'blacktimeleft', clear: 1 },
    { p: 'OB', k: 'blackmovesleft', clear: 1 },
    { p: 'OW', k: 'whitemovesleft', clear: 1 },
    { p: 'WL', k: 'whitetimeleft', clear: 1 }
  ],

  /**
   * Check whether a group has liberties
   *
   * The algorithm stops as soon as it finds a liberty.
   *
   * @param {object} m0 - A point owned by the group to check
   * @param {number} m0.x - The x coordinate
   * @param {number} m0.y - The y coordinate
   * @param {number} assumeColor - Assume point has given color is NONE
   *   (move simulation).
   *
   * @return {?boolean} `true` if the group has liberties, `false` otherwise. If
   * `m0` doesn't have any stone, `null` is returned instead.
   */
  groupHasLiberties: function (m0, assumeColor) {
    if (!this._updateState()) return null;

    var self = this,
      size = self._size,
      board = self._board,
      sx = size[0],
      sy = size[1],
      x0 = m0.x,
      y0 = m0.y,
      itn0 = board[x0 + y0 * sx],
      checkColor = itn0.color,
      check, c, itn, i, ret = false;

    if (checkColor === itn0.NONE) {
      if (assumeColor) checkColor = itn0.color = assumeColor;
      else return null;
    } else {
      assumeColor = false;
    }

    itn0._check = true;
    check = [
      { x: x0, y: y0 - 1 },
      { x: x0 - 1, y: y0 },
      { x: x0, y: y0 + 1 },
      { x: x0 + 1, y: y0 }
    ];

    while((c = check.pop())) {
      if (c.x < 0 || c.x >= sx || c.y < 0 || c.y >= sy) continue;

      itn = board[c.x + c.y * sx];

      if (itn.color === itn.NONE) {
        ret = true;
        break;
      } else if (!itn._check && itn.color === checkColor) {
        itn._check = true;
        check.push(
          { x: c.x, y: c.y - 1 },
          { x: c.x - 1, y: c.y },
          { x: c.x, y: c.y + 1 },
          { x: c.x + 1, y: c.y }
        );
      }
    }

    /* reset check state of intersections */
    for (i = 0; i < board.length; i++) {
      delete board[i]._check;
    }

    if (assumeColor) itn0.color = itn0.NONE;

    return ret;
  },

  /**
   * Check liberties of neighbour groups (opposite color) for the given move.
   *
   * If any group has no liberty left and `dryRun` evaluates to `false`, the
   * stones of that group are removed from the board and the captured stones
   * counter is increased accordingly. The board state is assumed to be valid
   * before m0 is played.
   *
   * @param {GoSgf.Spec.Point} The origin intersection for the check (usually
   *        the last move played).
   *
   * @return {boolean} `true` if any group was captured, `false` otherwise.
   * @private
   */
  _checkCaptured: function (m0, dryRun) {
    /* The algorithm crawls around the m0 position (the last move played) in
     * search for captured groups of the opposite color. Assumes the board
     * state was valid before m0 was played, so only up/down/left/right need to
     * looked up. (iterative version to prevent call stack overflow).
     */
    var self = this,
      size = self._size,
      board = self._board,
      sx = size[0],
      sy = size[1],
      x0 = m0.x,
      y0 = m0.y,
      itn0 = board[x0 + y0 * sx],
      checkColor, _merge, libs, check, handled, captured,
      c, itn, ck, i, j;

    if (itn0.color === itn0.NONE) return false;

    checkColor = itn0.not();
    _merge = [{0:0},{1:1},{2:2},{3:3}];
    libs = [];
    check = [
      {x:x0, y: y0-1, g: 0},
      {x:x0 - 1, y: y0, g: 1},
      {x:x0, y: y0 + 1, g: 2},
      {x:x0 + 1, y: y0, g: 3}
    ];

    while ((c = check.pop())) {
      if (libs[c.g]) continue;
      if (c.x < 0 || c.x >= sx || c.y < 0 || c.y >= sy) continue;
      itn = board[c.x + c.y * sx];
      if (itn.color === itn.NONE) {
        libs[c.g] = true;
        continue;
      } else if (itn.color === checkColor) {
        ck = itn._check;
        if (ck === undefined) {
          itn._check = c.g;
          check.push(
            {x: c.x, y: c.y - 1, g: c.g},
            {x: c.x - 1, y: c.y, g: c.g},
            {x: c.x, y: c.y + 1, g: c.g},
            {x: c.x + 1, y: c.y, g: c.g}
          );
        } else if (ck !== c.g) {
          Object.assign(_merge[c.g], _merge[ck]);
          Object.assign(_merge[ck], _merge[c.g]);
          if (libs[c.g] || libs[ck]) {
            for (i in _merge[c.g]) {
              j = _merge[c.g][i];
              libs[j] = libs[c.g] || libs[ck];
            }
          }
        }
      }
    }
    handled = {};
    for (i = 0; i < 4; i++) {
      if (i in handled || libs[i]) continue;
      for (j = 0; j < board.length; j++) {
        itn = board[j];
        if (itn._check in _merge[i]) {
          if (!dryRun) {
            self._captured[checkColor]++;
            itn.color = itn.NONE;
          }
          captured = true;
        }
      }
      Object.assign(handled, _merge[i]);
    }

    /* reset check state of intersections */
    for (i = 0; i < board.length; i++) {
      delete board[i]._check;
    }

    return !!captured;
  },
  /**
   * Apply node properties on the current board state.
   *
   * @param {GoSgf.GameTree.Node} node - The node to render
   * @param {boolean} [isroot] - Whether the node is the root of a GameTree
   *
   * @returns {?boolean} true if the state update was a success, false on
   *    error. If the board was not initalized before calling this method, null
   *    is returned.
   *
   * @private
   */
  _renderNode: function (node, isroot) {
    // Assume the board state is that of the previous node in the tree.
    var self = this,
      board = self._board,
      w = self._size[0],
      len = board && board.length,
      i0, W, B, N, setup = [],
      move, moveItn;

    if (!board) return;

    i0 = board[0];
    W = i0.WHITE;
    B = i0.BLACK;
    N = i0.NONE;

    ([
      { p: 'AB', c: B },
      { p: 'AW', c: W },
      { p: 'AE', c: N }
    ]).forEach(function (set) {
      var color = set.c,
        i, itn;

      set = node[set.p] || [];
      for (i = 0; i < set.length; i++) {
        itn = set[i].x + set[i].y * w;
        // ignore points out of bound and points already setup in previous sets
        if (itn < 0 || itn >= len || setup[itn]) continue;
        board[itn].color = color;
        setup[itn] = 1;
      }
    });

    if (!isroot) {
      ([
        { p: 'B', c: B },
        { p: 'W', c: W }
      ]).forEach(function (m) {
        var itn;
        if (move) return; // cannot set both players moves
        if (m.p in node) {
          move = node[m.p];
          itn = move.x + move.y * w;
          if (itn < 0 || itn >= len || board[itn].color !== N) {
            move = { error: "Illegal move" };
            return;
          }
          moveItn = board[itn];
          moveItn.color = m.c;

          setup[itn] = 1;
        }
      });
    }

    if (move) {
      if (move.error) return false;
      self._checkCaptured(move);
    }
    self.lastMove = move;

    if ('PL' in node) {
      self.nextPlayer = node.PL;
    } else if (moveItn && moveItn.color !== N) {
      self.nextPlayer = moveItn.not();
    }

    self._updateVisible(node);
    self._updateInfos(node);

    return true;
  },
  /**
   * Update cached node infos and game infos from node properties.
   *
   * @param {GoSgf.GameTree.Node} node  A `Node` instance
   *
   * @private
   */
  _updateInfos: function (node) {
    var infos = this._infos,
      k, def;

    for (k in IPROPS) {
      if (!IPROPS.hasOwnProperty(k)) continue;
      def = IPROPS[k];
      if (def.node) delete infos[k];
      if (def.p in node) infos[k] = node[def.p];
    }
  },
  /**
   * Set node markup properties on board intersections.
   *
   * Previous markup is removed first.
   *
   * @param {GoSgf.GameTree.Node} ndoe  A `Node` instance
   */
  _updateMarks: function (node) {
    var self = this,
      board = self._board,
      w = self._size[0],
      len = board && board.length,
      lm = self.lastMove,
      marks = self.MARKS,
      def, prop, i, j,
      value, point, idx;

    if (!board) return;

    for (i = 0; i < len; i++) {
      delete board[i].mark;
      if (lm && (lm.x + w * lm.y) == i) {
        board[i].mark = Object.assign({}, self.lastMoveMark);
      }
    }

    for (var i = 0; i < marks.length; i++) {
      def = marks[i];
      prop = node[def.p] || [];
      for (var j = 0; j < prop.length; j++) {
        point = prop[j];
        value = {};
        if (def.composed) {
          value.label = point.second;
          point = point.first;
        }
        idx = point.x + w * point.y;
        if (idx < 0 || idx > len) return;
        board[idx].mark = Object.assign(board[idx].mark||{}, value, def.mark);
      }
    }
  },
  /**
   * Update the board state.
   *
   * Render nodes a pending render request, if any.
   *
   * @returns {boolean} true if the resulting state if valid, false otherwise.
   */
  _updateState: function () {
    var self = this,
      nav = self._queuedRender;

    if (!nav) return self._board != null;

    var isroot = true,
      rnav = self._rendered,
      nodes, n;

    delete self._queuedRender;
    delete self._lastError;

    if (rnav && nav.descendantOf(rnav, true)) {
      isroot = false;
    } else {
      self.clear(nav);
      rnav = null;
    }

    nodes = nav.getNodes(rnav);

    if (!nodes.length) return true; // already up-to-date

    for (var i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (!self._renderNode(n, isroot)) {
        var e = new Error("Illegal move detected!");
        e.illegal = true;
        e.path = nav.getNodePath(n);
        self._rendered = null;
        self._board = null;
        self._lastError = e;
        return false;
      }
      isroot = false;
    }

    self._updateMarks(n);
    self._rendered = nav.copy();

    return true;
  },
  /**
   * Apply a node's VW property (if any) to the current board.
   *
   * @param {GoSgf.GameTree.Node} node  A `Node` instance
   */
  _updateVisible: function (node) {
    var self = this,
      w = self._size[0],
      board = self._board,
      i, p, vw;

    if (!('VW' in node)) return;

    vw = self._VW = node.VW.slice(); // save the active VW property

    for (i = 0; i < board.length; i++) {
      delete board[i].hidden;
    }

    if (!vw.length) return;

    for (i = 0; i < board.length; i++) {
      board[i].hidden = true;
    }

    for (i = 0; i < vw.length; i++) {
      p = vw[i];
      delete board[p.x + w * p.y].hidden;
    }
  }
}

module.exports = Board;

/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var FILL = 'fill:',
  STROKE = 'stroke:',
  STROKE_WIDTH = 'stroke-width:',
  STROKE_LINECAP = 'stroke-linecap:',
  C_WHITE = '#fff',
  C_BLACK = '#000',
  C_NONE = 'none',
  SCALE = 30,
  SCALE_MIN = 5,
  COORD_ALPHA = 'ABCDEFGHJKLMNOPQRSTUVWXYZ',
  COORD_ALPHA_LENGTH = COORD_ALPHA.length,
  VIEWBOX_ODDOFF = 0.5,
  CLS_BOARD_PREFIX = 'gosgf-board-',
  CLS_MARK_PREFIX = CLS_BOARD_PREFIX + 'mark-',
  INLINE_BG = '#ec7',
  Aproto = Array.prototype,
  floor = Math.floor,
  max = Math.max;

/**
 * Convert an x coordinate to its alpha text representation.
 *
 * @param {number} x - The x coordinate
 *
 * @return {String} The text corresponding to the x coordinate.
 * @private
 */
function x2alpha(x) {
  var l = COORD_ALPHA_LENGTH,
    s = '';

  do {
    s = COORD_ALPHA[x%l] + s;
    x = floor(x/l);
  } while (x > 0);

  return s;
}

/**
 * Build a SVG tag string.
 *
 * If `closing` is ommitted or `false`, the string is in the form
 * `<tagName attr1="value1" ... >`. If `closing` is true, the string generated
 * is `</tagName>` and `attrs` and `selfClose` arguments are ignored.
 *
 * @param {boolean} [closing] - If `true`, create the closing string `</tagName>`
 * @param {String} tagName - The name of the tag.
 * @param {object} [attrs] - An object whose properties will be added as element
 *   attributes. Values should be strings or arrays of strings.
 * @param {boolean} selfClose - If true, the string ends with `/>` instead of
 * `>`.
 *
 * @return {string} The generated tag string
 * @private
 */
function tag(closing, tagName, attrs, selfClose) {
  var buffer, k, v;
  if (typeof closing !== "boolean") {
    selfClose = attrs;
    attrs = tagName;
    tagName = closing;
    closing = false;
  }

  if (closing) return '</'+tagName+'>';

  buffer = '<' + tagName;
  if (attrs) {
    for (k in attrs) {
      v = attrs[k];
      if (!attrs.hasOwnProperty(k) || v == null) continue;
      buffer += ' '+k+'="'+(Array.isArray(v) ? v.join(' ') : v)+'"';
    }
  }
  return buffer + (selfClose ? '/>' : '>');
}


/**
 * Options object for GoSvg instances
 * @typedef {object} GoSvg~Options
 * @property {boolean} coordinates - Whether to print coordinates around the
 *  board (Default: `true`)
 * @property {number} viewBoxOffset - An offset to apply to the SVG tag's
 *  `viewBox` attribute. Needed for clean 1:1 rendering with odd stroke-width
 *  (Default: `0.5`)
 * @property {number} scale - The scaling size for elements coordinates in
 *  generated data. (Default: `30`).
 * @property {number} dotRadius - The radius of *hoshi* dots. (Default: `3`)
 * @property {boolean} forceSize - Whether to write explicit `width` and
 *  `height` attributes in the `<svg>` tag. (Default: `false`)
 * @property {boolean} inlineCss - Whether to use inline css `style` attributes.
 *  (Default; `true`)
 *
 * @property {object} classes - An object defining classes to use with svg
 *  elements
 * @property {string} classes.background - class for the background element
 * @property {string} classes.coordinate - class for coordinates elements
 * @property {string} classes.dot - class for hoshis
 * @property {string} classes.grid - class for grid path element
 * @property {string} classes.nextPlayer - class for next player indicator
 * @property {string} classes.lastMove - class for last move marker, added to
 *  a stone element
 *
 * @property {object} classes.stone - An object containing color-specific
 *  classes for stones
 * @property {string} classes.stone.black - classes for black stones
 * @proeprty {string} classes.stone.white - classes for white stones
 *
 * @property {object} classes.mark - An object containing color and type-specific
 *  classes for marks
 * @property {string} classes.mark.black - classes for marks over black stones
 * @property {string} classes.mark.white - classes for marks over white stones
 * @property {string} classes.mark.empty - classes for marks over empty
 *  intersections
 * @property {string} classes.mark.mask - classes for mask element on empty
 *  intersections with marks.
 * @property {string} classes.mark.circle - classes for circle (CR) mark
 * @property {string} classes.mark.cross - classes for cross (MA) mark
 * @property {string} classes.mark.square - classes for square (SQ) mark
 * @property {string} classes.mark.triangle - classes for triangle (TR) mark
 * @property {string} classes.mark.selected - classes for selected (SL) mark
 * @property {string} classes.mark.hidden - classes for hidden intersections
 * @property {string} classes.mark.dimmed - classes for dimmed (DM) intersections
 */

/**
 * Create an svg representation of a board position.
 *
 * @param {GoSgf.Board} board - A board instance to render form.
 * @param {GoSvg~Options} [options] - An object containing options
 *
 * @constructor
 */
function GoSvg(board, options) {
  var o, ocls, cls,
    defaults = GoSvg.DEFAULTS;
  options = options || {};

  /**
   * Options used to render svg data
   * @type {GoSvg~Options}
   */
  this.options = o = Object.assign({}, defaults, options || {});

  // Special case for classes: we need to create a new copy if the object to
  // merge data in it properly.
  ocls = options.classes || {};
  o.classes = cls = Object.assign({}, defaults.classes, ocls);
  cls.stone = Object.assign({}, defaults.classes.stone, ocls.stone || {});
  cls.mark = Object.assign({}, defaults.classes.mark, ocls.mark || {});

  this._board = board;
}

GoSvg.DEFAULTS = {
  coordinates: true,
  viewBoxOffset: 0.5,
  scale: SCALE,
  dotRadius: 3,
  forceSize: false,
  inlineCss: true,

  classes: {
    background: CLS_BOARD_PREFIX + 'background',
    coordinate: CLS_BOARD_PREFIX + 'coordinate',
    dot: CLS_BOARD_PREFIX + 'dot',
    grid: CLS_BOARD_PREFIX + 'grid',
    nextPlayer: CLS_BOARD_PREFIX + 'next-player',
    lastMove: CLS_BOARD_PREFIX + 'last-move',
    hidden: CLS_BOARD_PREFIX + 'hidden',
    dimmed: CLS_BOARD_PREFIX + 'dimmed',
    stone: { /* populated below */ },
    mark: { /* populated below */ }
  }
};
(function(classes, i, colors, marks){
  colors = ['black', 'white'];
  marks = [
    'mask',
    'circle',
    'cross',
    'square',
    'triangle',
    'selected',
    'hidden',
    'dimmed',
    'label'];
  for (i = 0; i < colors.length; i++) {
    classes.stone[colors[i]] =
      CLS_BOARD_PREFIX + 'stone ' + CLS_BOARD_PREFIX + 'stone-' + colors[i];
    classes.mark[colors[i]] =
      CLS_MARK_PREFIX.slice(0, -1) + ' ' + CLS_MARK_PREFIX + colors[i];
  }
  for (i = 0; i < marks.length; i++) {
    classes.mark[marks[i]] = CLS_MARK_PREFIX + marks[i];
  }
})(GoSvg.DEFAULTS.classes);

GoSvg.prototype = {
  /**
   * Get layout informations about svg data to be generated
   *
   * @return {GoSvg~Layout} An object containing informations about
   *  the layout.
   */
  layout: function () {
    var options = this.options,
      vbOff = options.viewBoxOffset,
      scale = options.scale,
      coords = options.coordinates,
      board = this._board,
      size = board.size,
      coordsDelta = coords ? floor(scale / 2) : 0;

    if (!size) return null;

    return {
      viewBox: {
        left: -scale - coordsDelta + vbOff,
        top: -scale - coordsDelta + vbOff,
        width: (size.width + 1) * scale + coordsDelta,
        height: (size.height + 1) * scale + coordsDelta
      },
      board: {
        size: Object.assign({}, size),
        width: (size.width - 1) * scale,
        height: (size.height - 1) * scale
      },
      scale: scale,
      coordinates: coords
    };
  },
  toString: function () {
    var self = this,
      o = self.options,
      fSize = o.forceSize,
      inlineCss = o.inlineCss,
      classes = o.classes,
      board = self._board,
      boardData = board.board,
      layout = self.layout(),
      scale = layout.scale,
      coords = layout.coordinates,
      lBd = layout.board,
      width = lBd.size.width, height = lBd.size.height,
      bdWidth = lBd.width,
      bdHeight = lBd.height,
      viewBox = layout.viewBox,
      svg = [], lines = [],
      style, cls, mark,
      i, j, c, itn, lm, isc,
      dx, dy, mx, my;

    function open(tagName, attrs) { svg.push(tag(tagName, attrs)); }
    function add(tagName, attrs) {
      svg.push(tag(tagName, attrs, true));
    }
    function addBody(tagName, body, attrs) {
      body = body.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      svg.push(tag(tagName, attrs) + body + tag(true, tagName));
    }
    function close(tagName) {
      svg.push(tag(true, tagName));
    }
    function inline() {
      return inlineCss ? Aproto.join.call(arguments, ';') + ';' : null;
    }
    /* fontStyle([bold][,fill][,dsize])
     *   bold: boolean
     *   fill: string (css color)
     *   dsize: number (font-size: floor(scale/2)+dsize)
     */
    function fontStyle(bold, fill, dsize) {
      if (!inlineCss) return null;

      if (typeof bold !== 'boolean') {
        dsize = fill;
        fill = bold;
        bold = false;
      }
      if (typeof (fill) === 'number') {
        dsize = fill;
        fill = null;
      }
      dsize = +dsize || 0;

      var args = [
        'font-size:' + floor((2 * scale / 3) +dsize) + 'px',
        'text-anchor:middle',
        'alignment-baseline:middle',
        FILL + (fill || C_BLACK)
      ];
      if (bold) args.push('font-weight:bold');
      return args.join(';')+';';
    }
    function circle(cls, sx, sy, r, style) {
      add('circle', {
        'class': cls,
        cx: sx,
        cy: sy,
        r: r,
        style: inline.apply(self, style || [])
      });
    }
    function dot(x, y) {
      circle(classes.dot, x * scale, y * scale, o.dotRadius, [
        FILL + C_BLACK,
        STROKE + C_NONE
      ]);
    }
    function path(cls, d, style) {
      add('path', {
        'class': cls,
        d: (Array.isArray(d) ? d.join(' ') : d),
        style: inline.apply(self, style || [])
      });
    }

    // In the following functions, r = circumscribed circle radius
    function cross(cls, x, y, r, style) {
      path(cls, [
        'M'+(x-r)+' '+(y-r)+' L'+(x+r)+' '+(y+r),
        'M'+(x+r)+' '+(y-r)+' L'+(x-r)+' '+(y+r)
      ], style);
    }
    function square(cls, x, y, r, style) {
      path(cls, [
        'M'+(x-r)+' '+(y-r),
        'L'+(x-r)+' '+(y+r),
        'L'+(x+r)+' '+(y+r),
        'L'+(x+r)+' '+(y-r),
        'Z'
      ], style);
    }
    function triangle(cls, x, y, r, style) {
      var dx = 0.866025 * r,
        dy = r / 2;
      path(cls, [
        'M'+x+' '+(y-r),
        'L'+(x-dx)+' '+(y+dy),
        'L'+(x+dx)+' '+(y+dy),
        'Z'
      ], style);
    }

    function rect(cls, x, y, w, h, style) {
      add('rect', {
        'class': cls,
        x: x,
        y: y,
        width: w,
        height: h,
        style: inline.apply(self, style||[])
      });
    }
    function coordinate(text, x, y) {
      if (coords) {
        addBody('text', text, {
          'class': classes.coordinate,
          x: x,
          y: y,
          style: fontStyle(-1)
        });
      }
    }

    open('svg', {
      xmlns: "http://www.w3.org/2000/svg",
      version: "1.1",
      viewBox: [
        viewBox.left,
        viewBox.top,
        viewBox.width,
        viewBox.height
      ],
      width: fSize ? fSize * viewBox.width : null,
      height: fSize ? fSize * viewBox.height : null
    });

    rect(classes.background,
      viewBox.left, viewBox.top,
      viewBox.width, viewBox.height, [
        STROKE + C_NONE,
        FILL + INLINE_BG
      ]);

    // draw vertical lines and add horizontal coordinates if enabled
    for (i = 0; i < width; i++) {
      isc = i * scale;
      coordinate(x2alpha(i), isc, -scale);
      lines.push('M'+isc+' 0 L'+isc+' '+bdHeight);
    }

    // draw horizontal lines and add vertical coordinates if enabled
    for (i = 0; i < height; i++) {
      isc = i * scale;
      coordinate(''+(height - i), -scale, isc);
      lines.push('M0 '+isc+' L'+bdWidth+' '+isc);
    }

    path(classes.grid, lines, [
      STROKE + C_BLACK,
      STROKE_WIDTH + '1',
      STROKE_LINECAP + 'square',
      FILL + C_NONE
    ]);

    // draw dots
    if (width >= 9 && height >= 9) {
      dx = 2 + (width > 9 ? 1 : 0);
      dy = 2 + (height > 9 ? 1 : 0);
      mx = width % 2 ? (width - 1) / 2 : 0;
      my = height % 2 ? (height - 1) / 2 : 0;

      dot(dx, dy);
      dot(width - dx - 1, dy);
      dot(dx, height - dy - 1);
      dot(width - dx - 1, height - dy - 1);

      if (mx) {
        dot(mx, dy);
        dot(mx, height - dy - 1);
      }
      if (my) {
        dot(dx, my)
        dot(width - dx - 1, my);
      }
      if (mx && my) {
        dot(mx, my);
      }
    }

    if (coords) {
      // draw next player indicator
      mx = my = -scale;
      circle(classes.nextPlayer, mx, my, floor(scale/4), [
        FILL + (board.nextPlayer === boardData[0].WHITE ? C_WHITE : C_BLACK),
        STROKE + C_BLACK,
        STROKE_WIDTH + '1'
      ]);
    }

    lm = board.lastMove;
    for (j = 0; j < height; j++) {
      for (i = 0; i < width; i++) {
        itn = boardData[i + j * width];
        mx = i * scale;
        my = j * scale;
        c = (itn.color === itn.BLACK ? 'black' : 'white');
        mark = itn.mark || {};

        // draw stone if any
        if (itn.color !== itn.NONE) {
          cls = classes.stone[c] + (mark.last ? ' ' + classes.lastMove : '');
          style = [
            STROKE + ((mark.last && !mark.ignoreLastStyle) ? '#c30' : C_BLACK),
            STROKE_WIDTH + ((mark.last && !mark.ignoreLastStyle) ? '2' : '1'),
            FILL + c
          ];
          circle(cls, mx, my, floor((scale - 1) / 2), style);
        }

        // draw marks
        if (itn.color === itn.NONE && mark.label) {
          // for label readability, add a mask over empty intersections
          circle(classes.mark.mask, mx, my, floor(scale/2), [
            FILL + INLINE_BG,
            STROKE + C_NONE
          ]);
        }

        style = [
          STROKE + (itn.color === itn.BLACK ? C_WHITE : C_BLACK),
          STROKE_WIDTH + '2',
          FILL + C_NONE
        ];
        cls = classes.mark[c] + (mark.type ? ' ' + classes.mark[mark.type] : '');
        isc = floor(scale / 4);

        switch (itn.hidden ? '' : mark.type) {
          case 'circle':
            circle(cls, mx, my, isc, style);
            break;
          case 'cross':
            cross(cls, mx, my, isc, style);
            break;
          case 'square':
            square(cls, mx, my, isc, style);
            break;
          case 'triangle':
            triangle(cls, mx, my, 1.25 * isc, style);
            break;
          case 'selected':
            rect(cls, mx - (scale / 2), my - (scale / 2), scale, scale, [
              STROKE + C_NONE,
              FILL + 'rgba(255, 255, 0, 0.5)'
            ]);
            break;
        }

        if (!itn.hidden && mark.label) {
          addBody('text', '' + mark.label, {
            'class': classes.mark[c] + classes.mark.label,
            x: mx,
            y: my,
            style: fontStyle(true, itn.color === itn.BLACK ? C_WHITE : C_BLACK)
          });
        }

        if (itn.hidden || mark.dimmed) {
          // for dimmed or hidden intersections, we use a mark over with
          // background color (simpler)
          rect(classes.mark[itn.hidden ? 'hidden' : 'dimmed'],
            mx - scale / 2, my - scale / 2, scale + 0.35, scale + 0.35, [
              STROKE + C_NONE,
              FILL + INLINE_BG,
              'opacity:' + (itn.hidden ? '1.0' : '0.7')
            ]);
        }
      } // for i
    } // for j

    close('svg');

    return svg.join('');
  }
};


module.exports = GoSvg;

/* Browser global */
if (typeof window !== 'undefined') window['GoSvg'] = GoSvg;

/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var Intersection = require('./intersection'),
  WHITE = Intersection.WHITE,
  BLACK = Intersection.BLACK,
  escapeREcomposed = /([\]:\\])/g,
  escapeRE = /([\]\\])/g,
  dayPattern = '(?:0[1-9]|[12][0-9]||3[01])',
  monthPattern = '(?:0[1-9]|1[02])',
  moveCHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function _anyToString(v, composed) {
  if (v == null) return '';
  if (typeof v.toString === 'function') {
    v = v.toString();
  } else {
    v = ''+v;
  }
  return v.replace(composed ? escapeREcomposed : escapeRE, '\\$1');
}

function validatorError(code, str, extra) {
  if (extra) {
    str = str.replace(/{(.[^}]*)}/g, function (m, g1) {
      if (g1 === '{' || g1 === '}') return g1;
      return (g1 in extra) ? extra[g1] : m;
    });
  }
  var e = new Error(str);
  if (extra) Object.assign(e, extra);
  e.code = 'sgf:validator:'+code;
  return e;
}

/**
 * Point object.
 *
 * @property {number} x - The x coordinate (0-based index)
 * @property {number} y - The y coordinate (0-based index)
 *
 * @alias GoSgf.Spec.Point
 * @constructor
 */
function Point(x, y) {
  var l = arguments.length;
  if (l === 1 && typeof x === 'string') {
    this.fromString(x);
  } else if (l === 2) {
    this.x = +x;
    this.y = +y;
  } else {

  }
}

Point.prototype = {
  /**
   * Set point coordinates from 2-char string.
   *
   * @param {string} s - 2-characters string composed of alpha characters
   *    (lowercase + uppercase). The first character is the x coordinate, the
   *    second the y coordinate. Coordinates go from `'a' = 0` to `'Z' = 51`.
   */
  fromString: function (s) {
    var x = moveCHARS.indexOf(s[0]),
      y = moveCHARS.indexOf(s[1]);
    if (x < 0 || y < 0) {
      throw validatorError('point', "Invalid point string", {
        value: s,
        remove: true
      });
    }
    this.x = x;
    this.y = y;
  },
  /**
   * Get the point coordinates as a 2-length array.
   *
   * @returns {number[]} the array `[ this.x, this.y ]`
   */
  toArray: function () { return [ this.x, this.y ]; },
  /**
   * Convert the point to a 2-char string (reverse of `#fromString()`)
   *
   * Example:
   *
   * ```js
   * (new Point(4, 2)).toString(); // returns 'ec'
   * ```
   *
   * @returns {string} A 2-char string representing the point coordinates
   */
  toString: function () {
    return moveCHARS[this.x] + moveCHARS[this.y];
  }
};


/**
 * Create a Composed instance.
 *
 * Represents a pair of values, of any type.
 *
 * @alias GoSgf.Spec.Composed
 * @constructor
 */
function Composed(first, second) {
  /**
   * The first component of the composed value
   * @type {*}
   */
  this.first = first;
  /**
   * The second component of the composed value
   * @type {*}
   */
  this.second = second;
}

Composed.prototype = {
  /**
   * Get the components as a 2-length array.
   *
   * @returns {Array} The array `[ this.first, this.second ]`
   */
  toArray: function () {
    return [ this.first, this.second ];
  },
  /**
   * Encode the composed value as a string.
   *
   * The result is encoded according to the SGF specification (characters
   * escaped as required).
   *
   * @returns {string} The encoded composed value
   */
  toString: function () {
    return _anyToString(this.first, true)
      + ':' + _anyToString(this.second, true);
  }
};


/**
 * Create a Node instance.
 *
 * @param {object} assign - An object containing properties to assign on the
 *    node. Thoses properties are assumed to have valid decoded values.
 *
 * @alias GoSgf.Spec.Node
 * @constructor
 */
function Node(assign) {
  this._raw = {};
  if (assign) Object.assign(this, assign);
}

/**
 * A function called to format a value passed in as a binary string.
 * `this` is set to the `Spec` instance calling the formater.
 *
 * The formater can decide to ignore a value by returning `null` or 
 * throwing an exception to provide additional feedback on the error.
 * Such thrown instances should contain a property `code` set to a string
 * prefixed with `'sgf:validator:'` (exception without this property will be
 * propagated upward and stop the validation process). Additionally, the
 * exception can set the `fatal` property to true if the validation must be
 * interrupted, or a `fallback` value to be used as the formatted value.
 *
 * @callback GoSgf.Spec~Formater
 *
 * @param {string} value - A binary string.
 * @param {...*} extra - formater-specific optional extra parameters.
 *    A formater must be able to do a default formatting without any extra
 *    parameter set, even if it accepts some.
 *
 * @returns {*} The formated value or `null`/`undefined` if a parsing error
 *    occurs and the value should be ignored.
 */

/**
 * A decoder function to be used in nodes validation.
 *
 * @callback GoSgf.Spec~Decoder
 *
 * @param {string} key - The property name
 * @param {string[]} values - An array of raw values
 *
 * @returns {*} The decoded value.
 */

/**
 * An encoder function used to serialize property values.
 *
 * @callback GoSgf.Spec~Encoder
 *
 * @param {*} value - A decoded property value
 *
 * @returns {string} Encoded values, included brakets `'[]'` around each value.
 */

/**
 * Create a Spec instance.
 *
 * Implement SGF file format (`FF[4]`) for Go games (`GM[1]`)
 * {@link http://www.red-bean.com/sgf/}
 *
 * @alias GoSgf.Spec
 * @constructor
 */
function Spec() {
  this._init();
}

Spec.Composed = Composed;
Spec.Point = Point;
Spec.Node = Node;

Spec.prototype = {
  /**
   * Default charset (used to reset the spec state)
   * @type {string}
   */
  charsetDefault: 'latin1',
  /**
   * Default size.
   * @type {number[]}
   */
  sizeDefault: [ 19, 19 ],
  /**
   * A map of strings accepted as the utf-8 charset
   */
  utf8: {
    'utf8': 1,
    'UTF8': 1,
    'utf-8': 1,
    'UTF-8': 1
  },
  /**
   * Enforce that a key is found on a root node.
   *
   * Throw an error if the spec is not setup for root node processing.
   * @private
   */
  _checkRoot: function (key) {
    if (!this.isroot) {
      throw validatorError('root', "Root property '{key}' used outside of root node", {
        key: key,
        remove: true
      });
    }
  },
  /**
   * A map of SGF versions supported by the implementation
   */
  VERSIONS: { 3: 1, 4: 1 },
  /**
   * Verify that the format version is supported.
   *
   * Throw an error if it is not.
   * @private
   */
  _checkSpecVersion: function (version) {
    if (!this.VERSIONS[version]) {
      throw validatorError('format', "Unsupported SGF format version ({version})", {
        version: version,
        fatal: true
      });
    }
  },
  /**
   * Decode a value, based on the charset.
   *
   * According to the SGF spec, raw values are assumed to be `latin1`, unless an
   * explicit charset is provided in the root node (`CA` property). Due to
   * browsers and node.js limitations, this implementation supports only latin1
   * and utf-8 encodings.
   *
   * *Note*: Browserify provide a browser-side implementation of Buffer when
   * generating the bundle.
   *
   * The spec is expected to have parsed the charset property of the root node
   * prior to calling this function.
   *
   * @param {string} value - The value do decode. It should contain `latin1`
   * codepoints (data read as a `binary` string) even if charset is `utf-8`.
   *
   * @returns {string} The decoded value. It is equal to the input value if the
   *    charset is not utf-8.
   *
   * @private
   */
  _decode: function (value) {
    if (value == null) value = '';

    if (this.utf8[this.charset]) {
      value = Buffer.from(value, 'binary').toString('utf8');
    }

    return value;
  },
  /**
   * Format a Point value
   *
   * @param {string} value - A 2-characters string representing a point
   *    (see {@link GoSgf.Spec.Point#fromString|Point#fromString()})
   *
   * @returns {GoSgf.Spec.Point} a Point instance
   *
   * @private
   */
  _formatPoint: function (value) {
    var p;
    if (value.length == 2) {
      p = new Point(value);
    }
    return p;
  },
  /**
   * Format a real (number) value.
   *
   * Value must be a decimal string representation of a number.
   *
   * *Note*: Even though the specification doesn't explicitly support it,
   * hexadecimal numbers represented as `0xNNN...` will be properly decoded as a
   * side-effect of the method used in this implementation.
   *
   * @param {string} value - A string representing a number
   *
   * @returns {number} a number or `NaN`.
   *
   * @private
   */
  _formatReal: function (value) {
    return +value;
  },
  /**
   * Format a pair of numbers (e.g. `'123:456'`)
   *
   * If the value contains only one number (e.g. `'123'`), the number is
   * dupplicated as the second element.
   *
   * @param {string} value - A string representing a pair of numbers
   *
   * @returns {?GoSgf.Spec.Composed} A composed instance containing 2 numbers,
   * or `null` if any of the elements does not parse to a number (`NaN`).
   *
   * @private
   */
  _formatComposeNumbers: function (value) {
    var a, b;
    value = value.split(':');
    a = Math.floor(value[0]);
    b = Math.floor(value[value.length - 1]);
    return (value.length > 2 || isNaN(a) || isNaN(b)) ? null : (new Composed(a, b));
  },
  /**
   * Format Points representations.
   *
   * 2 forms are accepted:
   * - `'xx'`: A point representation (see
   *   {@link GoSgf.Spec.Point#fromString|Point#fromString()})
   *   is formatted as a {@link GoSgf.Spec.Point|Point} instance
   * - `'xx:yy'`: A composition of points. If `isrange` is `true`, the
   *   composition is expanded to a list of points in the rectangle including
   *   top-left corner `xx` and bottom-right corner `yy`. Otherwise, it is
   *   formatted to a pair (`Composed`) of points.
   *
   * @param {string} value - A string representing points, pairs or
   * ranges.
   *
   * @returns {?GoSgf.Spec.Composed|GoSgf.Spec.Point|GoSgf.Spec.Point[]} The
   *    formatted value, or `undefined` on error.
   *
   * @private
   */
  _formatPoints: function (value, isrange) {
    var self = this, ret, x, y;
    if (!value) return;
    value = value.split(':');
    if (value.length == 1) {
      ret = self._formatPoint(value[0]);
    } else if (value.length == 2) {
      value[0] = self._formatPoint(value[0]);
      value[1] = self._formatPoint(value[1]);
      if (value[0] && value[1]) {
        if (isrange) {
          ret = [];
          for (y = value[0].y; y <= value[1].y; y++) {
            for (x = value[0].x; x <= value[1].x; x++) {
              ret.push(new Point(x, y)); // numbers => no throw
            }
          }
        } else {
          ret = new Composed(value[0], value[1]);
        }
      }
    }
    return ret;
  },
  /**
   * Format a label (`xx:Label string`)
   *
   * A label is the composition of a `Point` and a `string`.
   *
   * @param {string} value - A string representing a label definition
   *
   * @returns {?GoSgf.Spec.Composed} A `Composed` instance containing a `Point`
   * and a `string`, or `null` on invalid `value`.
   *
   * @private
   */
  _formatLabel: function (value) {
    if (value) value = value.match(/^([^:]+):(.*)$/);
    if (value) {
      value = new Composed(this._formatPoint(value[1]), this._formatSimpleText(value[2]));
    }
    return (value && value.first) ? value : null;
  },
  /**
   * Format a color (`B` or `W`)
   *
   * @param {string} value - A string representing a color
   *
   * @returns {number} A number representing the color, or `null` on invalid
   *    `value`.
   *
   * @see goSgf.Board.Intersection.BLACK
   * @see goSgf.Board.Intersection.WHITE
   * @private
   */
  _formatColor: function (value) {
    return (value.length === 1 && ("BW".indexOf(value.toUpperCase()) + 1)) || null;
  },
  /**
   * Format a text value
   *
   * Formatted text is first decoded according to the charset ({@link
   * #_decode}), then line feeds are normalized to `\n`, other whitespaces are
   * converted to spaces, escaped line feeds are removed and escaped characters
   * are replaced by the corresponding character.
   *
   * @param {string} value - A binary string.
   *
   * @returns {string} the formatted text
   *
   * @private
   */
  _formatText: function (value) {
    return this._decode(value)
      .replace(/\n\r|\r\n|\r|\n/g, "\n")
      .replace(/[\t\v]/g, " ")
      .replace(/\\(.)/g, function (m, g1) {
        return g1 === "\n" ? "" : g1;
      });
  },
  /**
   * Format a simple text value.
   *
   * Applies the same conversions as {@link #_formatText()}. Additionally,
   * whitespaces sequences (including line feeds) are collapsed to single
   * spaces and leading/trailing spaces are removed.
   *
   * @param {string} value - A binary string
   *
   * @returns {string} the formatted simple text.
   *
   * @private
   */
  _formatSimpleText: function (value) {
    return this._formatText(value)
      .replace(/\s+/g, ' ')
      .replace(/^ +| +$/, '');
  },
  /**
   * Format a highlight value
   *
   * @param {string} value - a highlight string (`'1'` or `'2'`)
   *
   * @returns {number} `1`, `2` or `null` for any other parsed value.
   */
  _formatHighlight: function (value) {
    value = this._formatReal(value);
    return (value === 1 || value === 2) ? value : null;
  },
  /**
   * Format the values list of a property expecting a single value.
   *
   * @param {string[]} values - A list of raw values
   * @param {GoSgf.Spec~Formater} formater - A formater function
   * @param {*} [defaultEmpty=null] - Default value to return if `values` is
   *    empty
   * @param {Array} [extra] - Extra parameters to pass in `formater` arguments
   *
   * @returns {*} The formatted value. The type depends on the `formater`.
   *    If `values` is empty, `defaultEmpty` is returned. If more than one
   *    value, returns `undefined`.
   */
  _oneValue: function (values, formater, defaultEmpty, extra) {
    if (values.length > 1) return;
    if (!values.length) return defaultEmpty;
    if (formater) {
      return formater.apply(this, [values[0]].concat(extra||[]));
    }
    return values[0];
  },
  /**
   * Format the values list of a property expecting multiple values.
   *
   * @param {string[]} values - A list of raw values
   * @param {GoSgf.Spec~Formater} formater - A formater function
   * @param {boolean} [allowEmpty=false] - Whether to accept an empty list as
   *    value.
   * @param {Array} [extra] - Extra parameters to pass in `formater` arguments
   *
   * @returns {?Array} An array of formatted values. The type of elements
   *    depends on the `formater`. Errors thrown by the formatter, are stored
   *    in the `Spec#errors` array.
   */
  _listValues: function (values, formater, allowEmpty, extra) {
    var self = this, ret = [], i, v;
    if (!values.length) return allowEmpty ? ret : null;
    for (i = 0; i < values.length; i++) {
      v = values[i];
      try {
        if (formater) v = formater.apply(self, [v].concat(extra||[]));
      } catch (e) {
        if ((''+e.code).substr(0, 4) !== 'sgf:') throw e;
        this.errors.push(e);
        if (e.fatal) throw e;
        v = e.fallback || null;
      }
      if (v instanceof Array) {
        ret.push.apply(ret, v);
      } else if (v != null) {
        ret.push(v);
      }
    }
    return ret;
  },
  /**
   * Decode a Point property.
   * @type {GoSgf.Spec~Decoder}
   */
  decodePoint: function (key, values) {
    return this._oneValue(values, this._formatPoint);
  },
  /**
   * Decode a flag property.
   * Ignore any value.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeFlag: function (key, values) {
    /* ignoring values */
    return true;
  },
  /**
   * Decode a number property.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeNumber: function (key, values) {
    return this._oneValue(values, this._formatReal);
  },
  /**
   * Decode the SGF format version property.
   * Ensure the format version is supported (throws a fatal exception
   * otherwise).
   * @type {GoSgf.Spec~Decoder}
   */
  decodeSpec: function (key, values) {
    this._checkRoot(key);
    values = this.decodeNumber(key, values);
    this._checkSpecVersion(values);
    return values;
  },
  /**
   * Regular expression validating a 2-digits day string.
   * @type {RegExp}
   */
  DAY_RE: new RegExp('^'+dayPattern+'$'),
  /**
   * Regular expression validating a 2-digits month string.
   * @type {RegExp}
   */
  MONTH_RE: new RegExp('^'+monthPattern+'$'),
  /**
   * Regular expression validating a date strings in one of the following forms:
   *   - `YYYY`
   *   - `YYYY-MM`
   *   - `YYYY-MM-DD`
   *   - `MM`
   *   - `MM-DD`
   *   - `DD`
   *
   * @type {RegExp}
   */
  DATE_RE: new RegExp ('^(?:'
    + [
      // YYYY-MM-DD | YYYY-MM | YYYY
      '(?:[0-9]{4}(?:-'+monthPattern+'(?:-'+dayPattern+')?)?)',
      // MM-DD | MM
      '(?:'+monthPattern+'(?:-'+dayPattern+')?)',
      // DD
      dayPattern
    ].join('|')
  + ')$'),
  /**
   * Decode a date property.
   * the dates list can be compressed. (see SGF spec for details)
   * @type {GoSgf.Spec~Decoder}
   */
  decodeDates: function (key, value) {
    var dates = [],
      prefix = '',
      pl = 0,
      v, vl, i;

    value = this.decodeSimpleText(key, value).replace(/ +/g, '');
    value = value.split(',');

    for (i = 0; i < value.length; i++) {
      v = value[i];

      if (!this.DATE_RE.test(v)) {
        // We ignore malformed dates and reset the prefix.
        // (allow auto-recovery on next YYYY date)
        prefix = '';
        pl = 0;
        continue;
      }

      vl = v.length;

      if (vl === 10) { // YYYY-MM-DD
        prefix = v.substr(0, 8); // YYYY-MM-
      } else if (vl === 7) {
        prefix = v.substr(0, 4) + '-'; // YYYY-
      } else if (vl === 4) { // YYYY
        // Shortcuts not allowed after YYYY dates
        prefix = '';
      } else if (!pl) {
        // prefix required for the following cases.
        // If missing, skip the value (prefix already empty)
        continue;
      } else if (vl === 5 && pl) { // MM-DD
        prefix = prefix.substr(0, 4) + '-';
        v = prefix + v;
        prefix += v.substr(5, 3); // YYYY-MM-
      } else if (vl === 2 && (
        (pl === 5 && this.MONTH_RE.test(v)) ||
        (pl === 8 && this.DAY_RE.test(v)))
      ) { // MM || DD depending on prefix
        v = prefix + v;
        // prefix don't change
      } else {
        // Invalid date format with the current prefix value
        // Reset prefix state to allow auto-recovery on next YYYY date.
        prefix = '';
        v = null;
      }

      if (v) dates.push(v);
      pl = prefix.length;
    }

    return dates.length ? dates : null;
  },
  /**
   * Decode the game type (`GM` property).
   *
   * Ensure the game type is `1` (go game). Throw a `sgf:validator` error
   * otherwise.
   *
   * @type {GoSgf.Spec~Decoder}
   */
  decodeGameType: function (key, values) {
    this._checkRoot(key);
    values = this.decodeNumber(key, values);
    if (values !== 1) {
      throw validatorError('gametype', "Unsupported game type. GM[1] required.", {
        key: key,
        fatal: true
      });
    }
    return values;
  },
  /**
   * Decode the variation mode property.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeVariationMode: function (key, values) {
    this._checkRoot(key);
    values = this.decodeNumber(key, values);
    if (values < 0 || values > 3) {
      /* strip unknown flags */
      values = values > 0 ? values&3 : 0;
    }
    return values;
  },
  /**
   * Decode the board size
   * Throw a `sgf:validator` error if the board size is not valid, with the
   * fallback value `this.sizeDefault`.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeBoardSize: function (key, values) {
    var l, size, a, b, dsz = this.sizeDefault.slice();
    this._checkRoot(key);
    values = this._oneValue(values, this._formatComposeNumbers);
    if (!values) {
      throw validatorError('boardsize', "Invalid board size", {
        key: key,
        fallback: dsz
      });
    }
    a = values.first;
    b = values.second;
    l = moveCHARS.length;
    if (!(a >= 2 && b >= 2 && a <= l && b <= l)) {
      throw validatorError('boardsize', "Illegal board size {size}. 2 < SZ < {max}", {
        key: key,
        size: '[' + a + ':' + b + ']',
        min: 2,
        max: l,
        fallback: dsz
      });
    }
    return values.toArray();
  },
  /**
   * Decode a list of points with range definitions.
   * By default, the list can't be empty. A 3rd boolean parameter `allowEmpty`
   * can be provided to allow an empty list.
   * @type {GoSgf.Spec~Decoder}
   */
  decodePointsList: function (key, values, allowEmpty) {
    return this._listValues(values, this._formatPoints, allowEmpty, [true]);
  },
  /**
   * Decode a list of points with range definitions.
   * The list can be empty.
   * @type {GoSgf.Spec~Decoder}
   */
  decodePointsEList: function (key, values) {
    return this.decodePointsList(key, values, true);
  },
  /**
   * Decode a color property
   * @type {GoSgf.Spec~Decoder}
   */
  decodeColor: function (key, values) {
    return this._oneValue(values, this._formatColor);
  },
  /**
   * Decode the charset property.
   * Ensure the property is set on a root node.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeCharset: function (key, values) {
    this._checkRoot(key);
    values = this._oneValue(values);
    return values && (this.charset = values);
  },
  /**
   * Decode a simple text property.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeSimpleText: function (key, values) {
    return this._oneValue(values, this._formatSimpleText);
  },
  /**
   * Decode a text property.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeText: function (key, values) {
    return this._oneValue(values, this._formatText);
  },
  /**
   * Decode a highlight property.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeHighlight: function (key, values) {
    return this._oneValue(values, this._formatHighlight);
  },
  /**
   * Decode a Real (number) property.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeReal: function (key, values) {
    return this._oneValue(values, this._formatReal);
  },
  /**
   * Decode a property as a list of pairs of points.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeComposedPointsList: function (key, values) {
    return this._listValues(values, this._formatPoints);
  },
  /**
   * Decode a property as a list of labels.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeLabelList: function (key, values) {
    return this._listValues(values, this._formatLabel);
  },
  /**
   * Decode a property as a pair of simple texts.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeSimpleTexts: function (key, values) {
    var s = this._oneValue(values, this._formatSimpleText),
      v, s1, s2;

    if (s == null) return;

    v = s.split(':');
    s1 = v.shift();
    while (s1.substr(-1) == "\\" && v.length) {
      s1 += ':'+v.shift();
    }
    s2 = v.join(':');
    return new Composed(s1, s2);
  },
  /**
   * Decode a property of a pair of number + text.
   * If the property allows `[]` and `[:text]`, the 3rd argument `defaultValue`
   * should be set as a `Composed` instance.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeNumberText: function (key, values, defaultValue) {
    var s = this.decodeSimpleTexts(key, values), n;
    if (!s) return defaultValue;
    if (s.first) {
      n = this._formatReal(s.first);
    } else if (!defaultValue) {
      return;
    } else {
      n = +(defaultValue.first);
    }
    return isNaN(n) ? null : new Composed(n, s.second);
  },
  /**
   * Decode a figure property.
   * @type {GoSgf.Spec~Decoder}
   */
  decodeFigure: function (key, values) {
    return this.decodeNumberText(key, values, new Composed(32768, ""));
  },
  /**
   * Generic value encoder.
   *
   * if `value` has a method `.toString()` it is called. Otherwise, implicit
   * string conversion is used (`'' + value`)
   *
   * @type {GoSgf.Spec~Encoder}
   */
  encodeValue: function (v) {
    return '['+_anyToString(v)+']';
  },
  /**
   * Encode a flag value.
   * @type {GoSgf.Spec~Encoder}
   */
  encodeFlag: function (v) {
    return '[]';
  },
  /**
   * Encode the board size.
   * @type {GoSgf.Spec~Encoder}
   */
  encodeBoardSize: function (s) {
    return '['+(s[0] === s[1] ? s[0] : s.join(':'))+']';
  },
  /**
   * Encode dates.
   * @type {GoSgf.Spec~Encoder}
   */
  encodeDates: function (list) {
    var compressed = [], previous, i, v, cv, vl;
    // strings in the list are assumed to be in the format 'YYYY-MM-DD'
    // Strings that are not of the right lengths (10, 7 or 4) are discarded.
    for (i = 0; i < list.length; i++) {
      cv = v = list[i];
      vl = v.length;

      if (vl !== 10 && vl !== 7 && vl !== 4) continue;

      if (previous) {
        if (vl === 10 && previous.substr(0, 7) === v.substr(0, 7)) {
          // Same year and month => compress to DD only.
          cv = v.substr(8);
        } else if (previous.substr(0, 4) === v.substr(0, 4)) {
          // Same year => compress to MM or MM-DD, depending on value.
          cv = v.substr(5);
        }
      }

      compressed.push(cv);
      previous = v;
    }
    return '[' + compressed.join(',') + ']';
  },
  /**
   * Encode a list of values (generic, calls `#encodeValue()`).
   * @type {GoSgf.Spec~Encoder}
   */
  encodeList: function (list) {
    var self = this;
    if (!list || !list.length) return '[]';
    return list.map(function (v) {
      return self.encodeValue(v);
    }).join('');
  },
  /**
   * Encode a color.
   * @type {GoSgf.Spec~Encoder}
   */
  encodeColor: function (c) {
    return '['+(c === BLACK ? 'B' : (c === WHITE ? 'W' : ''))+']';
  },
  /**
   * Encodes a list of points.
   *
   * **TODO**: According to the SGF specification, the implementation should
   * compress points lists to rectangles where possible. 
   *
   * @type {GoSgf.Spec~Encoder}
   */
  encodePointsList: function (list) {
    // TODO: Compress the list to rectangles where possible.
    //       Need rectangles decomposition algorithm.
    return this.encodeList(list);
  },

  /**
   * List of setup properties.
   * @type {string[]}
   */
  SETUP: [ 'AB', 'AE', 'AW', 'PL' ],
  /**
   * List of move properties.
   * @type {string[]}
   */
  MOVE: [ 'B', 'KO', 'MN', 'W' ],
  /**
   * List of info properties.
   * @type {string[]}
   */
  INFO: [
    'AN', 'BR', 'BT', 'CP', 'DT', 'EV', 'GN', 'GC', 'ON', 'OT',
    'PB', 'PC', 'PW', 'RE', 'RO', 'RU', 'SO', 'TM', 'US', 'WR',
    'WT',
    // Go specific properties
    'HA', 'KM'
  ],

  /**
   * Initialize the Spec function.
   *
   * called by the constructor.
   *
   * @private
   */
  _init: function () {
    var self = this,
      decodePoint = self.decodePoint,
      decodeFlag = self.decodeFlag,
      decodeNumber = self.decodeNumber,
      decodePointsEList = self.decodePointsEList,
      decodePointsList = self.decodePointsList,
      decodeSimpleText = self.decodeSimpleText,
      decodeText = self.decodeText,
      decodeHighlight = self.decodeHighlight,
      decodeReal = self.decodeReal,
      decodeComposedPointsList = self.decodeComposedPointsList,
      encodeValue = self.encodeValue,
      encodeFlag = self.encodeFlag,
      encodePointsList = self.encodePointsList,
      encodeList = self.encodeList;

    /**
     * Map of decoders.
     * @type {object}
     */
    this.DECODERS = {
      B:  decodePoint,
      W:  decodePoint,
      KO: decodeFlag,
      DO: decodeFlag,
      IT: decodeFlag,
      MN: decodeNumber,
      OB: decodeNumber,
      OW: decodeNumber,
      PM: decodeNumber,
      HA: decodeNumber,
      FF: self.decodeSpec,
      GM: self.decodeGameType,
      ST: self.decodeVariationMode,
      SZ: self.decodeBoardSize,
      DD: decodePointsEList,
      VW: decodePointsEList,
      TB: decodePointsEList,
      TW: decodePointsEList,
      AB: decodePointsList,
      AE: decodePointsList,
      AW: decodePointsList,
      CR: decodePointsList,
      MA: decodePointsList,
      SL: decodePointsList,
      SQ: decodePointsList,
      TR: decodePointsList,
      PL: self.decodeColor,
      CA: self.decodeCharset,
      DT: self.decodeDates,
      RE: decodeSimpleText,
      RU: decodeSimpleText,
      N:  decodeSimpleText,
      AN: decodeSimpleText,
      BR: decodeSimpleText,
      BT: decodeSimpleText,
      CP: decodeSimpleText,
      EV: decodeSimpleText,
      GN: decodeSimpleText,
      ON: decodeSimpleText,
      OT: decodeSimpleText,
      PB: decodeSimpleText,
      PC: decodeSimpleText,
      PW: decodeSimpleText,
      RO: decodeSimpleText,
      SO: decodeSimpleText,
      US: decodeSimpleText,
      WR: decodeSimpleText,
      WT: decodeSimpleText,
      C:  decodeText,
      GC: decodeText,
      DM: decodeHighlight,
      GB: decodeHighlight,
      GW: decodeHighlight,
      HO: decodeHighlight,
      UC: decodeHighlight,
      BM: decodeHighlight,
      TE: decodeHighlight,
      V:  decodeReal,
      TM: decodeReal,
      BL: decodeReal,
      WL: decodeReal,
      KM: decodeReal,
      AR: decodeComposedPointsList,
      LN: decodeComposedPointsList,
      LB: self.decodeLabelList,
      AP: self.decodeSimpleTexts,
      FG: self.decodeFigure
    };

    /**
     * Map of encoders.
     * @type {object}
     */
    this.ENCODERS = {
      B:  encodeValue,
      W:  encodeValue,
      KO: encodeFlag,
      DO: encodeFlag,
      IT: encodeFlag,
      MN: encodeValue,
      OB: encodeValue,
      OW: encodeValue,
      PM: encodeValue,
      HA: encodeValue,
      FF: encodeValue,
      GM: encodeValue,
      ST: encodeValue,
      SZ: self.encodeBoardSize,
      DD: encodePointsList,
      VW: encodePointsList,
      TB: encodePointsList,
      TW: encodePointsList,
      AB: encodePointsList,
      AE: encodePointsList,
      AW: encodePointsList,
      CR: encodePointsList,
      MA: encodePointsList,
      SL: encodePointsList,
      SQ: encodePointsList,
      TR: encodePointsList,
      PL: self.encodeColor,
      CA: encodeValue,
      DT: self.encodeDates,
      RE: encodeValue,
      RU: encodeValue,
      N:  encodeValue,
      AN: encodeValue,
      BR: encodeValue,
      BT: encodeValue,
      CP: encodeValue,
      EV: encodeValue,
      GN: encodeValue,
      ON: encodeValue,
      OT: encodeValue,
      PB: encodeValue,
      PC: encodeValue,
      PW: encodeValue,
      RO: encodeValue,
      SO: encodeValue,
      US: encodeValue,
      WR: encodeValue,
      WT: encodeValue,
      C:  encodeValue,
      GC: encodeValue,
      DM: encodeValue,
      GB: encodeValue,
      GW: encodeValue,
      HO: encodeValue,
      UC: encodeValue,
      BM: encodeValue,
      TE: encodeValue,
      V:  encodeValue,
      TM: encodeValue,
      BL: encodeValue,
      WL: encodeValue,
      KM: encodeValue,
      AR: encodeList,
      LN: encodeList,
      LB: encodeList,
      AP: encodeValue,
      FG: encodeValue
    };

    self.reset(true);
  },
  /**
   * Reset the state of the instance.
   *
   * @param {boolean} [discardErrors] - Whether to clear stored errors from
   *    previous validation.
   *
   * @returns {GoSgf.Spec} This instance.
   */
  reset: function (discardErrors) {
    this.charset = this.charsetDefault;
    this.isroot = true;
    if (discardErrors) this.errors = [];
    return this;
  },
  /**
   * Clear stored errors.
   */
  clearErrors: function () {
    this.errors = [];
  },
  /**
   * Check the charset property (`CA`) in a node.
   *
   * The charset is actually checked only if the spec instance is in the `root`
   * state, and if the `CA` property is found in `node._raw`.
   *
   * @param {GoSgf.Spec.Node} node - A node instance
   *
   * @return {string} The charset name.
   */
  checkCharset: function (node) {
    var ca;
    if (this.isroot && node._raw && 'CA' in node._raw) {
      ca = node._raw.CA;
      delete node._raw.CA;
      node.CA = this.DECODERS.CA.call(this, 'CA', ca);
    }
    return this.charset;
  },
  /**
   * Validate (decode) a node property's values.
   *
   * On success, `node[key]` is set to the decoded value.
   *
   * @param {GoSgf.Spec.Node} node - A node instance
   * @param {string} key - The property name
   * @param {string[]} values - Raw values to decode
   *
   * @returns {*} The decoded values.
   */
  validate: function (node, key, values) {
    if (values) {
      try {
        values = (this.DECODERS[key] || function () {}).call(this, key, values);
      } catch (e) {
        if ((''+e.code).substr(0, 4) !== 'sgf:') throw e;
        this.errors.push(e);
        if (e.fatal) throw e;
        values = e.fallback || null
        if (e.remove) return true; // don't set in node but delete from _raw
      }
      if (values != null) node[key] = values;
    }
    return values;
  },
  /**
   * Validate (decode) all properties on a node.
   *
   * @param {GoSgf.Spec.Node} node - A node instance
   * @param {boolean} [keepRaw] - Whether to keep unknown/errored `_raw`
   *    properties
   */
  validateNode: function (node, keepRaw) {
    var self = this, keys, k, i, values;
    if (!node._raw) return;
    self.checkCharset(node);
    keys = Object.keys(node._raw);
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      values = node._raw[k];
      if (self.validate(node, k, values) != null) {
        delete node._raw[k]; /* known and legal values are removed from _raw */
      }
    }
    if (!keepRaw) delete node._raw;
  },
  /**
   * Validate nodes on a gametree.
   *
   * @param {GoSgf.GameTree} gametree - a gametree
   * @param {boolean} [keepRaw] - Whether to preserve the `_raw` property on
   *    nodes.
   */
  validateTree: function (gametree, keepRaw) {
    var self = this, errors = [],
      infosTrace = { ':': false },
      infos = self.INFO,
      move = self.MOVE,
      setup = self.SETUP;

    if (typeof gametree.walk !== 'function') {
      throw new Error("Invalid gametree: .walk() function missing");
    }

    self.reset();
    gametree.walk(function (node, path) {
      var sPath = ':'+path.slice(0, -1).join(':'),
          pPath = ':'+path.slice(0, -2).join(':'),
          hasErrors, faultyProps = [],
          isSetup, isMove,
          i, k, err;

      self.clearErrors();

      if (!(sPath in infosTrace)) {
        // Propagate game infos trace to children variations if not set.
        infosTrace[sPath] = infosTrace[pPath];
      }
      try {
        self.isroot = (path.length === 1 && path[0] === 0);

        self.validateNode(node, keepRaw);

        for (i = 0; i < self.errors.length; i++) {
          errors.push({ error: self.errors[i], path: path });
        }

        // Further validation: check for properties conflicts here.

        // Check game-infos properties are not redefined.
        for (i = 0; i < infos.length; i++) {
          k = infos[i];
          if (k in node) {
            if (infosTrace[sPath]) {
              faultyProps[k] = node[k];
              hasErrors = true;
              delete node[k];
            } else {
              infosTrace[sPath] = true;
              break; // no further check (would trigger an error).
            }
          }
        }
        if (hasErrors) {
          errors.push({
            error: validatorError('conflict',
              "Redefined game info properties not allowed", {
                conflict: 'info',
                properties: faultyProps
              }),
            path: path
          });
        }

        // Check setup and move properties
        // The specification says applications should try to fix issues
        // and provide warning feedback, but it doesn't define how issues
        // should be fixed. We decide here to give priority to setup properties
        // in case of setup/move conflicts (i.e. remove move properties)
        hasErrors = false;
        faultyProps = [];
        for (i = 0; i < setup.length; i++) {
          isSetup = (setup[i] in node);
          if (isSetup) break;
        }
        for (i = 0; i < move.length; i++) {
          k = move[i];
          isMove = isMove || (k in node);
          if (k in node && isSetup) {
            hasErrors = true;
            faultyProps[k] = node[k];
            delete node[k];
          }
        }
        if (hasErrors) {
          errors.push({
            error: validatorError('conflict',
              "Setup and move properties are mutually exclusive", {
                conflict: 'setup,move',
                properties: faultyProps
              }),
            path: path
          });
        }

        // Check Move conflicts
        var isB = 'B' in node,
          isW = 'W' in node;
        if (isB && isW || !(isB || isW)) {
          // KO and MN require (B xor W).
          // We just ignore thoses in other cases.
          delete node.KO;
          delete node.MN;
        }
        if (isB && isW) {
          // Can't decide which one takes priority. Just convert them to setup
          // moves, expect if they are the same, in which case we ignore them.
          if (node.B.x !== node.W.x && node.B.y !== node.W.y) {
            if (!node.AB) node.AB = [];
            if (!node.AW) node.AW = [];
            node.AB.push(node.B);
            node.AW.push(node.W);
          }

          errors.push({
            error: validatorError('conflict',
              "B and W properties set on the same node", {
                conflict: 'B,W',
                properties: { B: node.B, W: node.W }
              }),
            path: path
          });

          delete node.B;
          delete node.W;
        }

        // Can't check AB/AE/AW here because they require current position
        // analysis. The board renderer will apply fixes on-the-fly if needed.
      } catch (e) {
        if ((''+e.code).substr(0, 4) !== 'sgf:') throw e;
        if (e.fatal) throw e;
        errors.push({ error: e, path: path });
      }
    });

    if (errors.length) gametree.errors = errors;
  },
  /**
   * Serialize a node (SGF-encoded).
   *
   * @param {GoSgf.Spec.Node} node - A node instance
   *
   * @returns {string} The serialized string.
   */
  nodeToString: function (node) {
    var self = this, props = [], keys, k, i, value;

    keys = Object.keys(node);
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      if (k[0] === '_') continue;
      value = (self.ENCODERS[k]||function () {}).call(self, node[k]);
      props.push(k+(value||'[]'));
    }

    keys = Object.keys(node._raw);
    for (i = 0; i < keys.length; i++) {
      value = node._raw[keys[i]];
      props.push(keys[i]+(value.map(function (s) { return '['+s+']'; }).join('')||'[]'));
    }

    return ';'+props.join('');
  }
};

module.exports = Spec;

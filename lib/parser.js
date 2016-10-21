/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var Spec = require('./spec.js'),
  GameTree = require('./gametree.js');

/* Tokens */
var TOK_VARIATION_START = 1,
    TOK_NODE_START = 2,
    TOK_NODE_END = 3,
    TOK_PROP_NAME = 4,
    TOK_VALUE_START = 5,
    TOK_VALUE = 6,
    TOK_VALUE_END = 7,
    TOK_VARIATION_END = 8,
    TOK_END = 9,
    TOK_PROP_CHAR = 10,
    TOK_SPACE = 11,
    TOK_ESCAPE = 12,
    TOK_ERROR = 100,
    TOK_NO_DATA = 110,
    TOK_UNREACHABLE = 999; // debug state for states that should not be possible.

var tokens = [
  null,
  'variation-start',
  'node-start',
  'node-end',
  'property-name',
  'value-start',
  'value',
  'value-end',
  'variation-end',
  'end',
  'property-char',
  'space',
  'escape'
];
tokens[TOK_ERROR] = 'error';
tokens[TOK_NO_DATA] = 'no-data';
tokens[TOK_UNREACHABLE] = 'unreachable';

/* Tokenizer states */
var STATE_START = 1,
    STATE_VARIATION = 2,
    STATE_VARIATIONS = 3,
    STATE_NODE = 4,
    STATE_NODE_END = 5,
    STATE_PROP_NAME = 6,
    STATE_PROP = 7,
    STATE_VALUE = 8,
    STATE_VALUE_END = 9,
    STATE_VALUES = 10;

/* Char to token map */
var TOKMAP = {
  '(': TOK_VARIATION_START,
  ')': TOK_VARIATION_END,
  ';': TOK_NODE_START,
  '[': TOK_VALUE_START,
  ']': TOK_VALUE_END,
  '\\': TOK_ESCAPE,
};
function _addToken(s, tok) {
  if (!s) return;

  for (var i = 0; i < s.length; i++) {
    TOKMAP[s[i]] = tok;
  }
}
_addToken(' \t\r\n\v', TOK_SPACE);
_addToken('ABCDEFGHIJKLMNOPQRSTUVWXYZ', TOK_PROP_CHAR);

/**
 * An object describing a token
 * @typedef {Object} GoSgf.Parser~TokenInfo
 * @property {number} token - The token id
 * @property {number} index - The position of the token in the source data
 * @property {number} lineno - The 0-based line number on which the token is
 * @property {number} charno - The 0-based character on the current line. Can be
 *    -1 if the token refer to a line feed
 * @property {?string} value - The value of the token, if any (undefined
 *    otherwise).
 */

/**
 * Create a Tokenizer instance.
 *
 * @param {string|Buffer} [data] - the SGF data to be parsed
 *        (see {@link goSgf.Parser.Tokenizer#reset|Tokenizer#reset()})
 *
 * @alias GoSgf.Parser.Tokenizer
 * @constructor
 */
function Tokenizer(data) {
  this.reset(data);
}

Tokenizer.prototype = {
  /**
   * Reset the tokenizer state.
   *
   * If `data` is set, also replace the current data.
   *
   * The SGF specification says that files are latin1 by default.
   * In order to load files correctly from browsers, the server should ensure
   * that data is sent at binary/latin1 to allow conversion to utf-8 if
   * necessary (see {@link GoSgf.Spec#_decode}). Special care must be taken if
   * data is put directly in an utf-8 encoded html page to ensure latin1
   * codepoints are preserved (e.g. by calling `buffer.toString('binary')`
   * before sending as utf8 in the output stream).
   *
   * For server-side use, data can be passed in as a raw buffer instead and let
   * the implementation do the necessary conversions.
   *
   * @param {string|Buffer} [data] - The data to feed in the tokenizer
   *
   * @return {GoSgf.Parser.Tokenizer} The tokenizer instance.
   */
  reset: function (data) {
    if (data) {
      if (data instanceof Buffer) {
        data = data.toString('binary');
      }
      this._input = data;
    }
    this._pos = this._lineno = 0;
    this._charno = -1;
    this._s = STATE_START; // state
    this._depth = 0;
    return this;
  },
  /**
   * Get the next token.
   *
   * @return {GoSgf.Parser~TokenInfo} The token infos.
   */
  get: function () {
    var self = this,
      _mem = self._pos,
      _memln = self._lineno,
      _memch = self._charno + 1,
      _len = 0,
      _lineseq = '',
      _state, c, r, tok, esc;

    if (!self._input) return { tok: TOK_NO_DATA };

    while (true) {
      _state = self._s;
      if (self._pos >= self._input.length) { // EOF
        tok = TOK_END;
        break;
      }
      c = self._input[self._pos++];
      self._charno++;

      if (c === '\r' || c === '\n') {
        // For line and char reporting on errors.
        // Need to handle \r, \n, \r\n and \n\r newline sequences
        // Should also work with mixed newline sequences, even though
        // it should not occur.
        if (!_lineseq || _lineseq === c) {
          self._lineno++;
          self._charno = -1;
          _lineseq = c;
        } else _lineseq = '';
      } else _lineseq = '';

      //console.log("%s %s %s %s", JSON.stringify(c), self._lineno, self._charno, self._pos);

      if (esc) {
        esc = 0;
        _len++;
        continue;
      }

      tok = TOKMAP[c];

      //console.log("  %s, %s", _state, tok);

      if (_state !== STATE_VALUE && _state !== STATE_PROP_NAME && tok === TOK_SPACE) {
        _mem++; // skip spaces in thoses contexts.
        _memln = self._lineno;
        _memch = self._charno;
        continue;
      }

      switch (_state) {
        case STATE_START:
          if (tok === TOK_VARIATION_START) {
            self._depth++;
            self._s = STATE_VARIATION;
          } else tok = TOK_ERROR;
          break;
        case STATE_VARIATION:
          if (tok === TOK_NODE_START) {
            self._s = STATE_NODE;
          } else tok = TOK_ERROR;
          break;
        case STATE_VARIATIONS:
          if (tok === TOK_VARIATION_START) {
            self._depth++;
            self._s = STATE_VARIATION;
          } else if (tok === TOK_VARIATION_END) {
            self._s = (--self._depth) > 0 ? STATE_VARIATIONS : STATE_START;
          } else tok = TOK_ERROR;
          break;
        case STATE_NODE:
          switch (tok) {
            case TOK_PROP_CHAR:
              self._s = STATE_PROP_NAME;
              _len++;
              tok = null;
              break;
            case TOK_NODE_START:
            case TOK_VARIATION_START:
            case TOK_VARIATION_END:
              self._pos--;
              self._charno--;
              self._s = STATE_NODE_END;
              tok = TOK_NODE_END;
              break;
            default:
              tok = TOK_ERROR;
          }
          break;
        case STATE_NODE_END:
          switch (tok) {
            case TOK_NODE_START:
              self._s = STATE_NODE;
              break;
            case TOK_VARIATION_START:
              self._depth++;
              self._s = STATE_VARIATION;
              break;
            case TOK_VARIATION_END:
              self._s = (--self._depth) > 0 ? STATE_VARIATIONS : STATE_START;
              break;
            default:
              tok = TOK_UNREACHABLE;
          }
          break;
        case STATE_PROP_NAME:
          switch (tok) {
            case TOK_VALUE_START:
              // we skip spaces, so we roll back only for VALUE_START here
              self._pos--;
              self._charno--;
            case TOK_SPACE:
              self._s = STATE_PROP;
              tok = TOK_PROP_NAME;
              break;
            case TOK_PROP_CHAR:
              _len++;
              tok = null;
              break;
            default:
              tok = TOK_ERROR;
          }
          break;
        case STATE_PROP:
          if (tok === TOK_VALUE_START) {
            self._s = STATE_VALUE;
          } else tok = TOK_ERROR;
          break;
        case STATE_VALUE:
          switch (tok) {
            case TOK_VALUE_END:
              self._pos--;
              self._charno--;
              self._s = STATE_VALUE_END;
              tok = TOK_VALUE;
              break;
            case TOK_ESCAPE:
              esc = 1;
            default:
              _len++;
              tok = null;
          }
          break;
        case STATE_VALUE_END:
          if (tok !== TOK_VALUE_END) tok = TOK_ERROR;
          self._s = STATE_VALUES;
          break;
        case STATE_VALUES:
          switch (tok) {
            case TOK_VALUE_START:
              self._s = STATE_VALUE;
              break;
            case TOK_NODE_START:
            case TOK_VARIATION_START:
            case TOK_VARIATION_END:
              self._pos--;
              self._charno--
              self._s = STATE_NODE_END;
              tok = TOK_NODE_END;
              break;
            case TOK_PROP_CHAR:
              _len++;
              self._s = STATE_PROP_NAME;
              tok = null;
              break;
            default:
              tok = TOK_ERROR;
          }
          break;
        default:
          // Should not be reachable, but present anyway for debug
          tok = TOK_UNREACHABLE;
      }
      if (tok != null) break;
    }

    tok = {
      token: tok
    };

    if (tok >= TOK_ERROR) {
      tok.index = self._pos - 1;
      tok.lineno = self._lineno;
      tok.charno = self._charno;
      _len = 0;
    } else {
      tok.index = _mem;
      tok.lineno = _memln;
      tok.charno = _memch;
    }
    if (_len)
      tok.value = self._input.substr(_mem, _len);
    tok.tokchars = tok.value || c;

    return tok;
  }
};


/**
 * Create a Parser instance.
 *
 * @alias GoSgf.Parser
 * @constructor
 */
function Parser() {
  /**
   * Tokenizer instance
   *
   * @type {GoSgf.Parser.Tokenizer}
   */
  this.tokenizer = new Tokenizer();

  /**
   * Spec instance
   *
   * @type {GoSgf.Spec}
   */
  this.spec = new Spec();
}

module.exports = Parser;

/**
 * Create a new error object with token infos.
 *
 * @param {GoSgf.Parser~TokenInfo} tok - The token object.
 * @private
 */
function tokenError(tok) {
  var e, ln = tok.lineno + 1, ch = tok.charno + 1;
  e = new Error("parse error: unexpected token '" + tok.tokchars + "'"
    + (tokens[tok.tok] ? "(" + tokens[tok.tok] + ")" : "")
    + " at line " + ln + ", char " + ch);
  e.code = 'sgf:parser';
  e.token = tokens[tok.tok];
  e.lineno = ln;
  e.charno = ch;
  e.index = tok.index;
  e.tokchars = tok.tokchars;
  return e;
}

Parser.prototype = {
  /**
   * Parse SGF data.
   *
   * Validation errors are set in the related gametrees with path informations.
   * Other errors will be thrown to the caller.
   *
   * @param {string|Buffer} data - The SGF data
   * @param {boolean} [keepRaw] - Whether to keep nodes' _raw properties
   *
   * @return {GoSgf.GameTree[]} - An array of gametrees.
   */
  parse: function (data, keepRaw) {
    var tokenizer = this.tokenizer.reset(data),
        spec = this.spec.reset(),
        collection = [], tok, gt;

    while (true) {
      tok = tokenizer.get();
      if (tok.token === TOK_END) break;
      if (tok.token !== TOK_VARIATION_START) {
        throw tokenError(tok);
      }
      try {
        gt = this._variation(tokenizer, spec.reset());
        spec.validateTree(gt, keepRaw);
        collection.push(gt);
      } catch (e) {
        // Some errors leave the tokenizer/parser in an unrecoverable state,
        // We need to propagate thoses errors to caller.
        if ((''+e.code).substr(0, 4) !== 'sgf:' || e.code === 'sgf:parser') throw e;

        // Push a dummy gametree to notify validation failures in parsable
        // input. Look for .nodes and .variations to identify dummies.
        collection.push({ errors: [ { error: e, path: [] } ] });
      }
    }

    return collection;
  },
  /**
   * Build a variation.
   *
   * The tokenizer must be in the `STATE_VARIATION` state (last token
   * was `TOK_VARIATION_START`)
   * 
   * @private
   *
   * @param {GoSgf.Parser.Tokenizer} tokenizer - A tokenizer instance
   * @param {GoSgf.Spec} spec - A spec instance
   *
   * @returns {GoSgf.GameTree} An unvalidated gametree.
   */
  _variation: function (tokenizer, spec) {
    var gametree = new GameTree(),
        more = true,
        tok;

    while (more) {
      tok = tokenizer.get();
      switch (tok.token) {
        case TOK_VARIATION_END:
          more = false;
          break;
        case TOK_NODE_START:
          gametree.addNode(this._node(tokenizer, spec));
          spec.isroot = false;
          break;
        case TOK_VARIATION_START:
          gametree.addVariation(this._variation(tokenizer, spec));
          break;
        default:
          throw tokenError(tok);
      }
    }
    return gametree;
  },
  /**
   * Build a node.
   *
   * The tokenizer must be in the `STATE_NODE` state (last token was
   * `TOK_NODE_START`)
   *
   * @private
   *
   * @param {GoSgf.Parser.Tokenizer} tokenizer - A tokenizer instance
   * @param {GoSgf.Spec} spec - A spec instance
   *
   * @returns {GoSgf.Spec.Node} An unvalidated node.
   */
  _node: function (tokenizer, spec) {
    var node = new (Spec.Node)(),
        more = true,
        property = null,
        tok;

    while (more) {
      tok = tokenizer.get();
      switch (tok.token) {
        case TOK_NODE_END:
          more = false;
          break;
        case TOK_PROP_NAME:
          property = tok.value;
          break;
        case TOK_VALUE_START:
          if (!(property in node._raw)) {
            node._raw[property] = [];
          }
          node._raw[property].push(this._value(tokenizer));
          break;
        default:
          throw tokenError(tok);
      }
    }
    return node;
  },
  /**
   * Fetch a value.
   *
   * The tokenizer must be in the `STATE_VALUE` state (last token was
   * `TOK_VALUE_START`)
   *
   * @private
   *
   * @param {GoSgf.Parser.Tokenizer} tokenizer - A tokenizer instance
   *
   * @returns {string} A raw value as string.
   */
  _value: function (tokenizer) {
    var tok, tokend;
    tok = tokenizer.get();
    tokend = tokenizer.get();
    if (tok.token != TOK_VALUE || tokend.token != TOK_VALUE_END) {
      throw tokenError(tok);
    }
    return tok.value;
  }
};

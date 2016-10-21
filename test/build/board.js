/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var expect = require('expect');

var GoSgf = require('../../lib/gosgf.js');
var normalize = require('./_normalize.js');

/**
 * `board` handler.
 *
 * Build tests for {@link GoSgf.Board} states
 *
 * @param {object} usecase - Case data
 * @param {string} usecase.method - Method's name
 */
function boardTest(usecase, options) {
  var board;

  if (!options.sgf) throw new Error("Missing options.sgf");

  if (usecase.board) board = normalize.board(usecase.board);

  return () => {
    var gosgf = new GoSgf(options.sgf, options.keepRaw),
      nav = gosgf.nav(0);

    if (usecase.path) {
      expect(nav.update(usecase.path)).toBe(true);
    }

    expect(nav.board).toBeA(GoSgf.Board);

    if (board) {
      expect(nav.board.board).toEqual(board);
    }
    if (usecase.infos) expect(nav.board.infos).toEqual(usecase.infos);
    if (usecase.capturedBy) expect(nav.board.capturedBy()).toEqual(usecase.capturedBy);
    if (usecase.nextPlayer) expect(nav.board.nextPlayer).toEqual(usecase.nextPlayer);
  };
}

module.exports = boardTest;

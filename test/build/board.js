/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var expect = require('expect');

/**
 * `board` handler.
 *
 * @alias Test.HANDLERS.board
 */
function boardTest(usecase, options) {
  function func(objects) {
    var board = objects.board;
    (['board', 'infos', 'nextPlayer', 'capturedBy']).forEach((k) => {
      if (!usecase[k] || usecase[k] === true) return;
      if (typeof board[k] === 'function') {
        expect(board[k]()).toEqual(usecase[k])
      } else {
        expect(board[k]).toEqual(usecase[k]);
      }
    });
  };

  func.pre = function (objects) {
    if (usecase.path) expect(objects.nav.update(usecase.path)).toBe(true);
  };

  return func;
}

module.exports = boardTest;

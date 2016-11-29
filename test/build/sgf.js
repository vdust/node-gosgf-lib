/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var expect = require('expect');

/**
 * `sgf` handler.
 *
 * @alias Tests.HANDLERS.sgf
 */
function sgfTest(usecase, options) {
  return (objects) => {
    expect(objects.gosgf.collection).toEqual(usecase.collection);
  };
}

module.exports = sgfTest;

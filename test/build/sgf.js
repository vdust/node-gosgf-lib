/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var expect = require('expect');

var GoSgf = require('../../lib/gosgf.js');
var normalize = require('./_normalize.js');

/**
 * `sgf` handler.
 *
 * Parse a string in the SGF format and compare the parsed data to the
 * normalized `usecase.collection` value.
 *
 * @param {object} usecase - Case data
 * @param {string} usecase.sgf - An SGF-formatted string to be parsed
 * @param {Array} usecase.collection - An array of gametrees, described with
 *        common object (typed by {@link Tests.normalize.gametrees}())
 * @param {object} options - Case options
 * @param {boolean} [options.keepRaw] - Whether to keep nodes' `_raw` property
 * 
 * @alias Tests.HANDLERS.sgf
 */
function sgfTest(usecase, options) {
  normalize.gametrees(usecase.collection, options);
  return () => {
    var gosgf = new GoSgf(usecase.sgf, options.keepRaw);
    expect(gosgf.collection).toEqual(usecase.collection);
  };
}

module.exports = sgfTest;

/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var expect = require('expect');

var GoSgf = require('../../lib/gosgf.js');
var normalize = require('./_normalize.js');

/**
 * `nav` handler.
 *
 * Build tests for {@link GoSgf.Nav} methods.
 *
 * @param {object} usecase - Case data
 * @param {string} usecase.method - Method's name
 * @param {Array} usecase.arguments - Arguments passed in the method call
 * @param {number[]} [usecase.updateBefore] - Call {@link GoSgf.Nav#update}
 *    with this path as argument before calling the test method
 * @param {*} [usecase.return] - the expected return value
 * @param {number[]} [usecase.path] - The expected cursor path after the method
 *    call
 * @param {object} [usecase.node] - The expected node pointed to by the cursor
 * @param {object} options - Case options. Inherited from suite context
 * @param {boolean} [options.keepRaw] - Whether to keep nodes' `_raw` property
 * @param {string} options.sgf - A single-gametree SGF string to load
 */
function navTest(usecase, options) {
  var node;
  if (usecase.node) {
    node = normalize.node(usecase.node, options);
  }
  if (!options.sgf) throw new Error("Missing options.sgf");

  return () => {
    var gosgf = new GoSgf(options.sgf, options.keepRaw),
      nav = gosgf.nav(0),
      expRet = usecase['return'],
      ret;

    expect(nav).toBeA(GoSgf.Nav);

    if (usecase.updateBefore) nav.update(usecase.updateBefore);

    ret = nav[usecase.method].apply(nav, usecase['arguments'] || []);

    if (expRet) {
      if (usecase.normalize) {
        expRet = normalize[usecase.normalize](expRet, options);
      }
      expect(ret).toEqual(expRet);
    }
    if (usecase.path) expect(nav.path).toEqual(usecase.path);
    if (node) expect(nav.get()).toEqual(node);
  };
}

module.exports = navTest;

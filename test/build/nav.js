/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var expect = require('expect');

/**
 * `nav` handler.
 *
 * @alias Tests.HANDLERS.nav
 */
function navTest(usecase, options) {
  var func = (objects) => {
    var nav = objects.nav;
    if (usecase.path) expect(nav.path).toEqual(usecase.path);
    if (usecase.gametree) expect(nav._gametree).toEqual(usecase.gametree);
    if (usecase.node) expect(nav.get()).toEqual(usecase.node);
  };

  func.pre = function (objects) {
    if (usecase.updateBefore) {
      objects.nav.update(usecase.updateBefore);
    }
  };

  return func;
}

module.exports = navTest;

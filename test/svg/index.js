#!/usr/bin/node
/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var fs = require('fs');
var GoSgf = require('../../lib/gosgf.js');
var GoSvg = require('../../lib/svg.js');

module.exports = function (callback) {
  fs.readFile(__dirname + '/test.sgf', 'binary', function (err, data) {
    var opts = {
      forceSize: true
    };

    var nav = (new GoSgf(data)).nav(0);

    nav.last();

    callback((new GoSvg(nav.board, opts)).toString());
  });
};

if (require.main === module) {
  module.exports(function (svg) {
    console.log("%s", svg);
  });
}

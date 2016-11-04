/**
 * gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var build = require('./build');

describe('Sgf parser:', function () {
  build(__dirname + '/suites/sgfTree.json');
  build(__dirname + '/suites/sgfProperties.json');
});

describe('Sgf navigation and board view:', function () {
  build(__dirname + '/suites/nav.json');
  build(__dirname + '/suites/board.json');
});

describe('Sgf edition:', function () {
  build(__dirname + '/suites/navedit.json');
});

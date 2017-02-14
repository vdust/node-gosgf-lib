#!/usr/bin/node

/* gosgf-lib
 * Copyright (c) 2017 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var fs = require('fs');
var GoSgf = require('../lib/gosgf');

var arg = process.argv[2];
var stream, data = '';

if (arg === '-h' || arg === '--help' || process.argv.length > 3) {
  console.log([
    "usage: sgf2json [file.sgf]",
    "       sgf2json -h|--help",
    "",
    "JSON data is written to stdout. Without argument, read sgf data from stdin."
  ].join("\n"));
  process.exit(process.argv.length > 3 ? 1 : 0);
}

if (arg) {
  stream = fs.createReadStream(arg, { encoding: 'binary' });
} else {
  stream = process.stdin;
  stream.setEncoding('binary');
}

stream.on('readable', () => {
  var chunk = stream.read();
  if (chunk !== null) {
    data += chunk;
  }
});

stream.on('end', () => {
  var sgf = new GoSgf(data);
  process.stdout.write(JSON.stringify(sgf));
});

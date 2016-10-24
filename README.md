# GoSgf

> A library to read and edit SGF files for Go games.


## Install

### Npm

    $ npm install gosgf-lib

### Git

    $ git clone https://github.com/vdust/node-gosgf-lib.git
    $ cd node-gosgf-lib && npm install

### Client-side

Use any of the install methods above and just link or copy the file
`dist/gosgf.min.js`


## Usage

```js
var fs = require('fs');
var GoSgf = require('gosgf-lib');
var game;

// The file MUST be read with 'binary' encoding (latin1 is the default
// charset according to the SGF specification). Charset conversions
// will be applied internally where needed when the collection instance is
// built. (in case the property 'CA' is set in the root node of a gametree
// in the file)
fs.readFile('path/to/game.sgf', 'binary', function (err, data) {
  if (err) return;

  var collection = GoSgf(data);

  // Navigate through the first gametree in collection
  var nav = collection.nav(0);

  if (nav.last()) console.log(nav.board.infos);
});
```

### TODO: Add some advanced usecases


## Documentation

### API Reference

The API reference can be generated using the command

    npm run build-doc

It can then be served using `http-server` (`npm install -g http-server`)

    http-server doc/


## Bugs

Use [the project's Github issues page][issues] to file hubs.


[issues]: https://github.com/vdust/node-gosgf-lib/issues

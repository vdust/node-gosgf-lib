# GoSgf

> A library to read and edit SGF files for Go games.


## Install

### Npm

    npm install gosgf-lib

### Git

    git clone https://github.com/vdust/node-gosgf-lib.git

### Client-side

Use any of the install methods above and just link or copy the file
`dist/gosgf.min.js`


## Usage

``` js
var GoSgf = require('gosgf-lib');
GoSgf.loadFromFile('path/to/game.sgf', (err, game) => {
  console.log(game.last().board().ascii());
});
```


## Bugs

Use [the project's Github issues page][issues] to file hubs.


[issues]: https://github.com/vdust/node-gosgf-lib/issues

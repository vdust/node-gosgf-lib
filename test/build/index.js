/* gosgf-lib
 * Copyright (c) 2016 Raphaël Bois Rousseau
 * License: ISC
 */

'use strict';

var fs = require('fs');

function subst(fmt, substs) {
  return fmt.replace(/\{([\{\}]|[^\}]+)\}/g, function (m, g1) {
    if (g1 === '{' || g1 === '}') return g1;
    var v = substs[g1] || '';
    if (Array.isArray(v)) {
      v = v.map((x) => JSON.stringify(x)).join(', ');
    }
    return v;
  }).replace(/^\s+|\s+$/g, '').replace(/\s\s+/g, ' ');
}

/**
 * Load and build a test suite from a JSON file.
 *
 * ```js
 * { "suite": "Suite name",
 *   "handler": "handler-name",
 *   "it": "used as test description, with '{substitutions}",
 *   "options": {
 *     "key": "handler-dependent, passed in each case",
 *   },
 *   "cases": [
 *     { "group": "Optional, wrap next cases in a describe()" },
 *
 *     { "options": {
 *         "key": "override/extend suite options"
 *       },
 *       "other-keys": "handler-dependent",
 *       "note": "'group' must not be a property."
 *     }
 *   ]
 * }
 * ```
 *
 * @param {string} filename - Suite file.
 */
function buildSuite(filename) {
  var data = fs.readFileSync(filename, 'utf-8');

  data = JSON.parse(data);

  describe(data.suite, function () {
    var i = 0,
      merge, group;

    while (i < data.cases.length) {
      group = data.cases[i].group;
      if (group) {
        group = data.groupFormat ? subst(data.groupFormat, data.cases[i]) : group;
        merge = data.cases[i].merge || {};
        describe(group, function () {
          i++;
          while (i < data.cases.length && !data.cases[i].group) {
            buildTest(data.handler, Object.assign({}, merge, data.cases[i]), data.it, data.options);
            i++;
          }
        });
      } else {
        buildTest(data.handler, data.cases[i], data.it, data.options);
        i++;
      }
    }
  });
}

module.exports = buildSuite;

/**
 * Handler function.
 * @callback buildSuite~HandlerFunction
 *
 * @param {object} usecase - case-specific data
 * @param {object} options - suite options merged with case options
 *
 * @returns {function} A testcase builder function passed in `it()`.
 */

/**
 * Load test case
 * 
 * Additionally, any `{key}` string in descFmt will be replaced by the
 * corresponding property in usecase.
 *
 * @param {string} handler - The handler key in `buildSuite.HANDLERS`
 * @param {object} usecase - An object containing handler-dependent data
 * @param {object} usecase.options - Usecase-specific options, overriding
 *        suite options
 * @param {string} descFmt - test description with `{substitutions}` from
 *        `usecase`
 * @param {object} globalOptions - suite options extended by `usecase.options`
 */
function buildTest(handler, usecase, descFmt, suiteOptions) {
  var options = Object.assign({}, suiteOptions || {}, usecase.options || {});
  var desc = subst(descFmt, usecase);
  try {
    it(desc, buildSuite.HANDLERS[handler](usecase, options));
  } catch (e) {
    console.log("%s: %s", desc, e);
  }
}

/**
 * Test handlers.
 * @type {object}
 *
 * Keys mapped to a {@link buildSuite~HandlerFunction|Handler Function}.
 */
buildSuite.HANDLERS = {};

// Load test handlers
var files = fs.readdirSync(__dirname), f, i, func;
for (i = 0; i < files.length; i++) {
  f = files[i];
  if (f === 'index.js' || f[0] === '_' || f.substr(-3) !== '.js') continue;
  func = require('./'+f);
  if (typeof func !== 'function') {
    console.log("%s handler module object should be function.", f);
    continue;
  }
  buildSuite.HANDLERS[f.slice(0, -3)] = func;
}

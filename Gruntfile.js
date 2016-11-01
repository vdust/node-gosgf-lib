'use strict';

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    mochaTest: {
      api: [ 'test/suites.js' ]
    },
    jsdoc: {
      doc: {
        options: {
          configure: 'jsdoc.json'
        }
      }
    },
    browserify: {
      dist: {
        files: {
          'dist/gosgf.js': [ 'lib/gosgf.js' ],
          'dist/gosvg.js': [ 'lib/svg.js' ]
        }
      }
    },
    uglify: {
      options: {
        banner: [
          "/* <%= pkg.name %> v<%= pkg.version %>",
          " * <%= pkg.description %>",
          " * Copyright (c) 2016 <%= pkg.author %>",
          " */\n"
        ].join('\n'),
        compress: {
          dead_code: true
        }
      },
      distmin: {
        files: {
          'dist/gosgf.min.js': 'dist/gosgf.js',
          'dist/gosvg.min.js': 'dist/gosvg.js'
        }
      }
    }
  });

  grunt.registerTask('test', [ 'mochaTest' ]);
  grunt.registerTask('dist', [ 'browserify', 'uglify' ]);
  grunt.registerTask('doc', [ 'jsdoc' ]);

  grunt.registerTask('default', [ 'mochaTest', 'browserify', 'uglify', 'jsdoc' ]);
};

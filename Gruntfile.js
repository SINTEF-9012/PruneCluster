'use strict';

module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);
    grunt.initConfig({
        clean: {
            dist: {
                files: [{
                    src: ["dist/*.js", "dist/*.d.ts", "dist/*.css"]
                }]
            },
            dev: {
                files: [{
                    src: ["build/*.js", "build/*.d.ts", "build/*.map", "build/*.css"]
                }]
            }
        },
        ts: {
            options: {
                target: 'es5',
                module: 'amd',
                declaration: true
            },
            dist: {
                src: ["PruneCluster.ts", "LeafletAdapter.ts", "LeafletSpiderfier.ts"],
                out: './dist/PruneCluster.js',
                options: {
                    sourceMap: false
                }
            },
            dev: {
                src: ["PruneCluster.ts", "LeafletAdapter.ts", "LeafletSpiderfier.ts"],
                out: './build/PruneCluster.js',
                options: {
                    sourceMap: true
                }
            }
        },
        concat: {
            dist: {
                src: ['./AMD_header', './dist/PruneCluster.js', './AMD_footer'],
                dest: './dist/PruneCluster.amd.js'
            }
        },
        uglify: {
            ts: {
                options: {
                    sourceMap: false
                },
                files: {
                    'dist/PruneCluster.min.js': ['dist/PruneCluster.js'],
                    'dist/PruneCluster.amd.min.js': ['dist/PruneCluster.amd.js']
                }
            }
        },
        copy: {
            dist: {
                src: 'LeafletStyleSheet.css',
                dest: 'dist/LeafletStyleSheet.css'
            },
            dev: {
                src: 'LeafletStyleSheet.css',
                dest: 'build/LeafletStyleSheet.css'
            }
        },
        exec: {
            'meteor-init': {
                command: [
                //Make sure Meteor is installed, per https://meteor.com/install.
                // he curl'ed script is safe; takes 2 minutes to read source & check.
                    'type meteor >/dev/null 2>&1 || { curl https://install.meteor.com/ | sh; }',
                //Meteor expects package.js to be in the root directory
                //of the checkout, so copy it there temporarily
                    'cp meteor/package.js .'
                ].join(';')
            },
            'meteor-cleanup': {
                //remove build files and package.js
                command: 'rm -rf .build.* versions.json package.js'
            },
            'meteor-test': {
                command: 'node_modules/.bin/spacejam --mongo-url mongodb:// test-packages ./'
            },
            'meteor-publish': {
                command: 'meteor publish'
            }

        }
    });

    grunt.registerTask('build:dist', [
        'clean:dist',
        'copy:dist',
        'ts:dist',
        'concat:dist',
        'uglify'
    ]);

    grunt.registerTask('build:dev', [
        'clean:dev',
        'copy:dev',
        'ts:dev'
    ]);

    grunt.registerTask('build',   ['build:dev']);
    grunt.registerTask('default', ['build:dev']);

    // Meteor tasks
    grunt.registerTask('meteor-test', ['exec:meteor-init', 'exec:meteor-test', 'exec:meteor-cleanup']);
    grunt.registerTask('meteor-publish', ['exec:meteor-init', 'exec:meteor-publish', 'exec:meteor-cleanup']);
    grunt.registerTask('meteor', ['exec:meteor-init', 'exec:meteor-test', 'exec:meteor-publish', 'exec:meteor-cleanup']);
};

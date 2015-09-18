'use strict';

module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);
	grunt.initConfig({
		clean: {
			ts: {
				files: [{
					src:["dist/*.js", "dist/*.d.ts", "dist/*.map", "dist/*.css"]
				}]
			}
		},
		ts: {
			build: {
				src:["PruneCluster.ts", "LeafletAdapter.ts", "LeafletSpiderfier.ts"],
				reference: "dist/PruneCluster.d.ts",
				out:'./dist/PruneCluster.js',
				// outDir:'build',
				options:{
					target: 'es5',
					module: 'commonjs',
					sourceMap:true
				}
			}
		},
		uglify: {
			ts: {
				options: {
					sourceMap: true,
					sourceMapName: 'dist/PruneCluster.min.js.map'
				},
				files: {
					'dist/PruneCluster.min.js' : ['dist/PruneCluster.js']
				}
			}
		},
		copy: {
			css: {
				src: 'LeafletStyleSheet.css',
				dest: 'dist/LeafletStyleSheet.css'
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

	grunt.registerTask('build', [
		'clean:ts',
		'copy:css',
		'ts:build',
		'uglify',
		'exec'
	]);

	grunt.registerTask('default', ['build']);

    // Meteor tasks
    grunt.registerTask('meteor-test', ['exec:meteor-init', 'exec:meteor-test', 'exec:meteor-cleanup']);
    grunt.registerTask('meteor-publish', ['exec:meteor-init', 'exec:meteor-publish', 'exec:meteor-cleanup']);
    grunt.registerTask('meteor', ['exec:meteor-init', 'exec:meteor-test', 'exec:meteor-publish', 'exec:meteor-cleanup']);
};
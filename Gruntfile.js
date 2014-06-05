'use strict';

module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);

	grunt.initConfig({
		clean: {
			ts: {
				files: [{
					src:["dist/*.js", "dist/*.d.ts", "dist/*.map"]
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
		}
	});

	grunt.registerTask('build', [
		'clean:ts',
		'ts:build',
		'uglify'
	]);

	grunt.registerTask('default', ['build']);
}
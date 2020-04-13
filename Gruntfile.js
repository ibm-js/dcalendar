/*global module */
module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),

		jshint: {
			src: [
				"**/*.js",
				"!node_modules/**/*.js",
				"!nls/ar/buttons.js",	// Error about character being silently deleted.  Translation problem??
				"!tests/ie-polyfills.js"
			],
			options: {
				jshintrc: ".jshintrc"
			}
		},

		// Task for compiling less files into CSS files
		less: {
			main: {
				files: [
					{
						expand: true,
						src: ["css/*.less", "!css/*Common.less"],
						ext: ".css"
					}
				]
			}
		}
	});

	// Load plugins
	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-contrib-less");
};
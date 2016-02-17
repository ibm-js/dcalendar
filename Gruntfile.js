/*global module */
module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),

		jshint: {
			src: [
				"**/*.js",
				"!node_modules/**/*.js",

				// Note: skip this file since it gives a JSHint error about a character being silently deleted.
				// It will have to be fixed by the translators.
				"!nls/he/loading.js"
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
						src: ["themes/*/*.less", "!themes/*/*Common.less"],
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
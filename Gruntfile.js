module.exports = function(grunt) {

    grunt.loadNpmTasks("grunt-sprockets");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-sass");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-cssmin");
    grunt.loadNpmTasks("grunt-crx-pkg");

    var pemFile = process.cwd() + "/build/LikeAPinboard.pem";

    grunt.initConfig({
        paths: {
            src: "src",
            dest: "build"
        },

        sprockets: {
            options: {
                allowDuplicateRequire: false
            },
            build: {
                files: ["<%= paths.src %>/js/index.js"],
                dest: "<%= paths.dest %>/popup.js"
            }
        },

        sass: {
            compile: {
                files: {
                    "<%= paths.dest %>/popup.css": "<%= paths.src %>/scss/main.scss"
                }
            }
        },

        cssmin: {
            minify: {
                files: {
                    "<%= paths.dest %>/popup.min.css": "<%= paths.dest %>/popup.css"
                }
            }
        },

        uglify: {
            build: {
                files: {
                    "<%= paths.dest %>/popup.min.js": "<%= paths.dest %>/popup.js"
                }
            }
        },

        copy: {
            build: {
                expand: true,
                flatten: true,
                cwd: "<%= paths.src %>/",
                src: "*",
                dest: "<%= paths.dest %>/",
                filter: "isFile"
            }
        },

        crx_pkg: {
            build: {
                options: {
                    pem: ( grunt.file.exists(pemFile) ) ? pemFile: "",
                    srcFolder: "<%= paths.dest %>",
                    destFolder: "./prod/LikeaPinboard.crx"
                }
            }
        }

    });

    grunt.registerTask("js", ["sprockets", "uglify"]);
    grunt.registerTask("css", ["sass", "cssmin"]);
    grunt.registerTask("default", ["js", "css", "copy"]);
    grunt.registerTask("build", ["js", "css", "copy", "crx_pkg"]);
};

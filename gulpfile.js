'use strict';

var gulp        = require('gulp'),
    $$          = require('gulp-load-plugins')();

var runSequence = require('run-sequence'),
    browserSync = require('browser-sync').create(),
    exec        = require('child_process').exec,
    path        = require('path'),
    escapeStr   = require('js-string-escape'),
    CleanCss    = require("clean-css");

var srcDir  = './src/',
    testDir = './test/',
    jsDir   = srcDir + 'js/',
    jsFiles = '**/*.js',
    destDir = './';

var js = {
    dir   : jsDir,
    files : jsDir + jsFiles
};

//  //  //  //  //  //  //  //  //  //  //  //

gulp.task('lint', lint);
gulp.task('test', test);
gulp.task('doc', doc);

gulp.task('build', function(callback) {
    clearBashScreen();
    runSequence('lint', 'test', 'doc', 'inject-css',
        callback);
});

gulp.task('watch', function () {
    gulp.watch([srcDir + '**', testDir + '**'], ['build'])
        .on('change', function(event) {
            browserSync.reload();
        });
});

gulp.task('default', ['build', 'watch'], function() {
    browserSync.init({
        server: {
            // Serve up our build folder
            baseDir: srcDir,
            routes: {
                "/bower_components": "bower_components"
            }
        },
        port: 5000
    });
});

gulp.task('inject-css', function () {
    var target = gulp.src(jsDir + 'foobars.js'),
        source = gulp.src(srcDir + 'css/foobars.css'),
        destination = gulp.dest(destDir);

    target
        .pipe($$.inject(source, {
            transform: cssToJsFn,
            starttag: '/* {{name}}:{{ext}} */',
            endtag: '/* endinject */'
        }))
        .pipe($$.rename('index.js'))
        .pipe(destination);
});

function cssToJsFn(filePath, file) {
    var css = new CleanCss({})
        .minify(file.contents.toString())
        .styles;

    file.contents = new Buffer("cssInjector.text = '" + escapeStr(css) + "';");

    return file.contents.toString('utf8');
}

function lint() {
    return gulp.src(js.files)
        .pipe($$.excludeGitignore())
        .pipe($$.eslint())
        .pipe($$.eslint.format())
        .pipe($$.eslint.failAfterError());
}

function test(cb) {
    return gulp.src(testDir + 'index.js')
        .pipe($$.mocha({reporter: 'spec'}));
}

function doc(cb) {
    exec(path.resolve('jsdoc.sh'), function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
}

function clearBashScreen() {
    var ESC = '\x1B';
    console.log(ESC + 'c'); // (VT-100 escape sequence)
}

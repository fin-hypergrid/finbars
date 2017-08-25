'use strict';

var gulp        = require('gulp'),
    $$          = require('gulp-load-plugins')();

var runSequence = require('run-sequence'),
    browserSync = require('browser-sync').create(),
    exec        = require('child_process').exec,
    path        = require('path'),
    escapeStr   = require('js-string-escape'),
    CleanCss    = require('clean-css');

var name     = 'finbars',
    srcDir   = './src/',
    distDir  = './dist/',
    testDir  = './test/',
    buildDir = './build/';

//  //  //  //  //  //  //  //  //  //  //  //

gulp.task('lint', lint);
gulp.task('test', test);
gulp.task('doc', doc);
gulp.task('browserify', function(callback) {
    browserify();
    browserifyMin();
    callback();
});
gulp.task('serve', browserSyncLaunchServer);

gulp.task('build', function(callback) {
    clearBashScreen();
    runSequence(
        'lint',
        'test',
        'doc',
        'inject-css',
        'browserify',
        callback);
});

gulp.task('watch', function () {
    gulp.watch([
            srcDir + name + '.js',
            testDir + 'index.js'
        ], ['build'])
        .on('change', function(event) {
            browserSync.reload();
        });
});

gulp.task('default', ['build', 'watch'], browserSyncLaunchServer);

gulp.task('inject-css', function () {
    var target = gulp.src(srcDir + name + '.js'),
        source = gulp.src(srcDir + name + '.css'),
        destination = gulp.dest(distDir);

    target
        .pipe($$.inject(source, {
            transform: cssToJsFn,
            starttag: '/* {{name}}:{{ext}} */',
            endtag: '/* endinject */'
        }))
        .pipe($$.rename('common.js'))
        .pipe(destination);
});

//  //  //  //  //  //  //  //  //  //  //  //

function cssToJsFn(filePath, file) {
    var STYLE_HEADER = 'cssFinBars = \'',
        STYLE_FOOTER = '\';';

    var css = new CleanCss({})
        .minify(file.contents.toString())
        .styles;

    file.contents = new Buffer(STYLE_HEADER + escapeStr(css) + STYLE_FOOTER);

    return file.contents.toString('utf8');
}

function lint() {
    return gulp.src(srcDir + name + '.js')
        .pipe($$.excludeGitignore())
        .pipe($$.eslint())
        .pipe($$.eslint.format())
        .pipe($$.eslint.failAfterError());
}

function test(cb) {
    return gulp.src(testDir + 'index.js')
        .pipe($$.mocha({reporter: 'spec'}));
}

function browserify() {
    return gulp.src(srcDir + 'browserify_root.js')
        .pipe($$.browserify({
            //insertGlobals : true,
            debug: true
        }))
        //.pipe($$.sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here:

        .on('error', $$.util.log)

        .pipe($$.rename(name + '.js'))
        .pipe(gulp.dest(buildDir)); // outputs to ./build/list-dragon.js for githup.io publish
}

function browserifyMin() {
    return gulp.src(srcDir + 'browserify_root.js')
        .pipe($$.browserify())
        .pipe($$.uglify())
        .pipe($$.rename(name + '.min.js'))
        .pipe(gulp.dest(buildDir)); // outputs to ./build/list-dragon.min.js for githup.io publish
}

function doc(cb) {
    exec(path.resolve('jsdoc.sh'), function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
}

function browserSyncLaunchServer() {
    browserSync.init({
        server: {
            // Serve up our build folder
            baseDir: buildDir,
            index: 'demo.html'
        },
        port: 5005
    });
}

function clearBashScreen() {
    var ESC = '\x1B';
    console.log(ESC + 'c'); // (VT-100 escape sequence)
}

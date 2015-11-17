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
    npmDir  = './',
    browDir = './browserified/';

var js = {
    dir   : jsDir,
    files : jsDir + jsFiles
};

//  //  //  //  //  //  //  //  //  //  //  //

gulp.task('lint', lint);
gulp.task('test', test);
gulp.task('doc', doc);
gulp.task('browserify', browserify);

gulp.task('build', function(callback) {
    clearBashScreen();
    runSequence(
        'lint',
        'test',
        'doc',
        'inject-css', // outputs ./index.js for npm publish
        'browserify', // outputs to ./browserified/finbars.js for githup.io publish
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
    var target = gulp.src(jsDir + 'finbars.js'),
        source = gulp.src(srcDir + 'css/finbars.css');
    target
        .pipe($$.inject(source, {
            transform: cssToJsFn,
            starttag: '/* {{name}}:{{ext}} */',
            endtag: '/* endinject */'
        }))
        .pipe($$.rename('index.js'))
        .pipe(gulp.dest(npmDir));
});

//  //  //  //  //  //  //  //  //  //  //  //

function cssToJsFn(filePath, file) {
    var css = new CleanCss({})
        .minify(file.contents.toString())
        .styles;

    file.contents = new Buffer("cssFinBars = '" + escapeStr(css) + "';");

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

function browserify() {
    return gulp.src(browDir + 'index.js')
        .pipe($$.browserify({
            //insertGlobals : true,
            debug : true
        }))
        //.pipe($$.sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here:
        //.pipe(uglify())
        .on('error', $$.util.log)
        .pipe($$.rename('finbars.js'))
        .pipe(gulp.dest(browDir));
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

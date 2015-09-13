'use strict';

var gulp      = require('gulp');
var eslint    = require('gulp-eslint');
var gitignore = require('gulp-exclude-gitignore');
var mocha     = require('gulp-mocha');
var plumber   = require('gulp-plumber');
var exec      = require('child_process').exec;
var path      = require('path');

var src = './src/';
var jsDir = src + 'js/';
var jsFiles = '**/*.js';

var js = {
    dir   : jsDir,
    files : jsFiles,
    path  : jsDir + jsFiles
};

function lint() {
    return gulp.src(js.path)
        .pipe(gitignore())
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
}

function test(cb) {
    var mochaErr;

    gulp.src('test/index.js')
        .pipe(plumber())
        .pipe(mocha({reporter: 'spec'}))
        .on('error', function(err) {
            mochaErr = err;
        })
        .on('end', function() {
            cb(mochaErr);
        });
}

function doc(cb) {
    exec(path.resolve('jsdoc.sh'), function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
}

gulp.task('lint', lint);
gulp.task('test', test);
gulp.task('doc', doc);

gulp.task('depTest', ['lint'], test);
gulp.task('depDoc', ['depTest'], doc);

gulp.task('watch', function() {
    gulp.watch(js.path, ['depDoc']);
});

gulp.task('default', ['depDoc', 'watch']);

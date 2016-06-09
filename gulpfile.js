'use strict';

var path   = require('path'),
    gulp   = require('gulp'),
    gzip   = require('gulp-gzip'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    mocha  = require('gulp-mocha'),
    Server = require('karma').Server;

var mainjs = './maptalks.gridlayer.js';

gulp.task('scripts', function () {
    return gulp.src(mainjs)
      .pipe(rename({suffix: '.min'}))
      .pipe(uglify())
      .pipe(gulp.dest('./'))
      .pipe(gzip())
      .pipe(gulp.dest('./'));
});

gulp.task('watch', ['test'], function () {
    gulp.watch(['src/**/*.js', 'test/**/*.js', './gulpfile.js'], ['test']);
});

gulp.task('test', ['scripts'], function (done) {
    gulp.src(['./node_modules/maptalks/dist/maptalks.js', mainjs, 'test/*.js'], {read: false})
        .pipe(mocha());
    var karmaConfig = {
        configFile: path.join(__dirname, '/karma.conf.js'),
        browsers: ['PhantomJS'],
        singleRun: false
    };
    new Server(karmaConfig, done).start();
});

gulp.task('default', ['watch']);

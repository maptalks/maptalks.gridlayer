const gulp = require('gulp'),
    pkg = require('./package.json'),
    BundleHelper = require('maptalks-build-helpers').BundleHelper,
    TestHelper = require('maptalks-build-helpers').TestHelper;
const bundleHelper = new BundleHelper(pkg);
const testHelper = new TestHelper();
const karmaConfig = require('./karma.config');

gulp.task('build', () => {
    const options = bundleHelper.getDefaultRollupConfig();
    options.globals = 'maptalks';
    return bundleHelper.bundle('src/index.js');
});

gulp.task('minify', gulp.series('build', () => {
    bundleHelper.minify();
}));

gulp.task('watch', gulp.series('build', () => {
    gulp.watch(['src/**/*.js', './gulpfile.js'],  gulp.series('build'));
}));

gulp.task('test', gulp.series('build', () => {
    testHelper.test(karmaConfig);
}));

gulp.task('tdd', gulp.series('build', () => {
    karmaConfig.singleRun = false;
    gulp.watch(['src/**/*.js'], ['test']);
    testHelper.test(karmaConfig);
}));

gulp.task('default', gulp.series('watch'));


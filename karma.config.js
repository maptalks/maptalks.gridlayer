const pkg = require('./package.json');

module.exports = {
    basePath : '.',
    frameworks: ['mocha'],
    plugins: ['karma-mocha', 'karma-mocha-reporter', 'karma-chrome-launcher'],
    files: [
        'node_modules/maptalks/dist/maptalks.js',
        'dist/' + pkg.name + '.js',
        'test/**/*.js'
    ],
    preprocessors: {
    },
    browsers: ['Chrome'],
    reporters: ['mocha'],
    singleRun : true
};

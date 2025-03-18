// Rollup plugins
import { nodeResolve as resolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import pkg from './package.json' with { type: "json" };

const production = process.env.BUILD === 'production';


const banner = `/*!\n * ${pkg.name} v${pkg.version}\n * LICENSE : ${pkg.license}\n * (c) 2016-${new Date().getFullYear()} maptalks.org\n */`;

let outro = pkg.name + ' v' + pkg.version;


outro = `typeof console !== 'undefined' && console.log('${outro}');`;

const external = ['maptalks'];
const FILEMANE = pkg.name;

const plugins = [
    json(),
    resolve(),
    commonjs()
];


function getEntry() {
    return './src/index.js';
}

const bundles = [
    {
        input: getEntry(),
        plugins: production ? plugins.concat([terser()]) : plugins,
        external,
        output: {
            'format': 'umd',
            'name': 'maptalks',
            'file': `dist/${FILEMANE}.js`,
            'sourcemap': true,
            'extend': true,
            'banner': banner,
            'outro': outro,
            'globals': {
                'maptalks': 'maptalks'
            }
        }
    },
    {
        input: getEntry(),
        plugins: plugins,
        external,
        output: {
            'sourcemap': true,
            'format': 'es',
            'file': `dist/${FILEMANE}.es.js`,
            'extend': true,
            'banner': banner,
            'globals': {
                'maptalks': 'maptalks'
            }
        }
    }

];

export default production ? bundles : bundles.slice(0, 1);

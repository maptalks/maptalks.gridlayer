# maptalks.gridlayer

[![CircleCI](https://circleci.com/gh/maptalks/maptalks.gridlayer.svg?style=shield)](https://circleci.com/gh/maptalks/maptalks.gridlayer)
[![NPM Version](https://img.shields.io/npm/v/maptalks.gridlayer.svg)](https://github.com/maptalks/maptalks.gridlayer)

GridLayer plugin for maptalks.js. A layer draws grids.

![screenshot]()

## Examples

* [Random square grids](https://maptalks.github.io/maptalks.gridlayer/demo/random.html).

## Install
  
* Install with npm: ```npm install maptalks.gridlayer```. 
* Download from [dist directory](https://github.com/maptalks/maptalks.gridlayer/tree/gh-pages/dist).
* Use unpkg CDN: ```https://unpkg.com/maptalks.gridlayer/dist/maptalks.gridlayer.min.js```

## Usage

As a plugin, `maptalks.gridlayer` must be loaded after `maptalks.js` in browsers.
```html
<link rel="stylesheet" href="https://unpkg.com/maptalks/dist/maptalks.css">
<script type="text/javascript" src="https://unpkg.com/maptalks/dist/maptalks.min.js"></script>
<script type="text/javascript" src="https://unpkg.com/maptalks.gridlayer/dist/maptalks.gridlayer.min.js"></script>
<script>
var data = [
    [1, 2, { properties : { foo : 1, foo2 : 'foo' }, symbol : { polygonFill : '#f00' } }],
    [[2, 4] , 5, { symbol : { polygonFill : '#f00' } }]
];
var options = {
    symbol : {
        lineWidth : 2
    }  
};
var gridLayer = new maptalks.GridLayer('grid', data, options)
    .addTo(map);
</script>
```
## Supported Browsers

IE 9-11, Chrome, Firefox, other modern and mobile browsers.

## API Reference

```GridLayer``` is a subclass of [maptalks.Layer](https://maptalks.github.io/docs/api/Layer.html) and inherits all the methods of its parent.

### `Constructor`

```javascript
new maptalks.GridLayer(id, data, options)
```

* id **String** layer id
* data **Object** see data format below
* options **Object** options
    * symbol **Object** symbol of the grid
    * container **String** specify the container for layer dom elements: 'front' or 'back' ('front' by default)
    * Other options defined in [maptalks.Layer](https://maptalks.github.io/docs/api/Layer.html)

```javascript
// data format
[
    //[col, row, { properties : properties, symbol : symbol}]
    //col: col_index or [beginIndex, endIndex]
    //row: col_index or [beginIndex, endIndex]
    // col is 1, row is 2
    [1, 2, { properties : { foo : 1, foo2 : 'foo' }, symbol : { polygonFill : '#f00' } }],
    //col is from 2 to 4 (3 columns), row is 5
    [[2, 4] , 5, { symbol : { polygonFill : '#f00' } }],
    //col is from 2 to 4 (3 columns), row is from 7 to 8 (2 rows)
    [[2, 4] , [7, 8], { symbol : { polygonFill : '#f00' } }]
]
```

### `getGrid()`

get layer's grid data

**Returns** `Object`

### `setGrid(data)`

set a new echarts option to the layer

* data **Array** set new data

**Returns** `this`

### `toJSON()`

export the GridLayer's JSON.

```javascript
var json = gridlayer.toJSON();
```

**Returns** `Object`

## Contributing

We welcome any kind of contributions including issue reportings, pull requests, documentation corrections, feature requests and any other helps.

## Develop

The only source file is ```index.js```.

It is written in ES6, transpiled by [babel](https://babeljs.io/) and tested with [mocha](https://mochajs.org) and [expect.js](https://github.com/Automattic/expect.js).

### Scripts

* Install dependencies
```shell
$ npm install
```

* Watch source changes and generate runnable bundle repeatedly
```shell
$ gulp watch
```

* Tests
```shell
$ npm test
```

* Watch source changes and run tests repeatedly
```shell
$ gulp tdd
```

* Package and generate minified bundles to dist directory
```shell
$ gulp minify
```

* Lint
```shell
$ npm run lint
```

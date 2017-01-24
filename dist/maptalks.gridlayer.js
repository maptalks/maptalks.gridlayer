/*!
 * maptalks.gridlayer v0.1.0
 * LICENSE : MIT
 * (c) 2016-2017 maptalks.org
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('maptalks')) :
	typeof define === 'function' && define.amd ? define(['exports', 'maptalks'], factory) :
	(factory((global.maptalks = global.maptalks || {}),global.maptalks));
}(this, (function (exports,maptalks) { 'use strict';

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

var defaultSymbol = {
    'lineColor': '#bbb',
    'lineWidth': 1,
    'lineOpacity': 1,
    'lineDasharray': [],
    'lineCap': 'butt',
    'lineJoin': 'round',
    'polygonOpacity': 0
};

var options = {
    'symbol': maptalks.Util.extend({}, defaultSymbol),
    'debug': false
};

/**
 * @classdesc
 * A layer draws grid.
 * A grid config contains:
 * {
        center : [0, 0],     // center of the grid
        width  : 100,        // width of the grid cell
        height : 100,        // height of the grid cell
        projection : true,   // true|false, width和height是否是投影坐标值
        cols      : [-1, '*'],  // '*'表示无限
        rows      : [2, 5],
        data   : [
          //长度为3的数组, arr[0]是x序号, arr[0]为y的序号, arr[2]为对象, properties属性为数据, symbol属性为样式
          [1, 2, { properties : { foo : 1, foo2 : 'foo' }, symbol : { ... } }],
          //arr[0]为数组, 表示区间内的格子, 此处表示第5行,2到4列的格子
          [[2, 4] , 5, { symbo : {...} }] //[]
        ]
    }
 * @class
 * @category layer
 * @extends {maptalks.Layer}
 * @param {String|Number} id        - layer's id
 * @param {Object} grid             - grid
 * @param {Object} [options=null]   - construct options
 * @param {*} options.* - options defined in [maptalks.Layer]{@link maptalks.Layer#options}
 */
var GridLayer = function (_maptalks$Layer) {
    _inherits(GridLayer, _maptalks$Layer);

    function GridLayer(id, grid, options) {
        _classCallCheck(this, GridLayer);

        var _this = _possibleConstructorReturn(this, _maptalks$Layer.call(this, id, options));

        _this._grid = grid;
        return _this;
    }

    /**
     * [getGrid description]
     * @return {[type]} [description]
     */


    GridLayer.prototype.getGrid = function getGrid() {
        return this._grid;
    };

    GridLayer.prototype.setGrid = function setGrid(grid) {
        this._grid = grid;
        return this.redraw();
    };

    GridLayer.prototype.redraw = function redraw() {
        if (this._getRenderer()) {
            this._getRenderer().redraw();
        }
        return this;
    };

    GridLayer.prototype.isEmpty = function isEmpty() {
        if (!this._grid) {
            return true;
        }
        return false;
    };

    GridLayer.prototype.clear = function clear() {
        delete this._grid;
        this.fire('clear');
        return this.redraw();
    };

    GridLayer.prototype.identify = function identify(coordinate) {
        var map = this.getMap(),
            grid = this.getGrid(),
            cols = grid.cols || ['*', '*'],
            rows = grid.rows || ['*', '*'];
        if (grid['projection']) {
            var res = map._getResolution(),
                cellW = grid.width / res,
                cellH = grid.height / res;
            var gridCenter = map.coordinateToContainerPoint(new maptalks.Coordinate(grid['center'])),
                point = map.coordinateToContainerPoint(coordinate);
            var extent = new maptalks.Extent(cols[0] === '*' ? -Number.MAX_VALUE : gridCenter.x + cols[0] * cellW, rows[0] === '*' ? -Number.MAX_VALUE : gridCenter.y + rows[0] * cellH, cols[1] === '*' ? Number.MAX_VALUE : gridCenter.x + cols[1] * cellW, rows[1] === '*' ? Number.MAX_VALUE : gridCenter.y + rows[1] * cellH);
            if (!extent.contains(point)) {
                return null;
            }
            var delta = 1E-6;
            var col = Math.ceil(Math.abs(point.x - gridCenter.x) / cellW - delta),
                row = Math.ceil(Math.abs(point.y - gridCenter.y) / cellH - delta);
            col = point.x > gridCenter.x ? col - 1 : -col;
            row = point.y > gridCenter.y ? row - 1 : -row;
            var cnw = gridCenter.add(cellW * col, cellH * row);
            var nw = map.containerPointToCoordinate(cnw),
                ne = map.containerPointToCoordinate(cnw.add(cellW, 0)),
                sw = map.containerPointToCoordinate(cnw.add(0, cellH));
            var w = map.computeLength(nw, ne),
                h = map.computeLength(nw, sw);
            return new maptalks.Rectangle(nw, w, h);
        } else {
            return null;
        }
    };

    /**
     * Export the GridLayer's JSON.
     * @return {Object} layer's JSON
     */


    GridLayer.prototype.toJSON = function toJSON() {
        var grid = this.getGrid();
        if (grid['center'] instanceof maptalks.Coordinate) {
            grid['center'] = grid['center'].toArray();
        }
        return {
            'type': 'GridLayer',
            'id': this.getId(),
            'options': this.config(),
            'grid': grid
        };
    };

    /**
     * Reproduce a GridLayer from layer's JSON.
     * @param  {Object} json - layer's JSON
     * @return {maptalks.GridLayer}
     * @static
     * @private
     * @function
     */


    GridLayer.fromJSON = function fromJSON(json) {
        if (!json || json['type'] !== 'GridLayer') {
            return null;
        }
        return new GridLayer(json['id'], json['grid'], json['options']);
    };

    return GridLayer;
}(maptalks.Layer);

GridLayer.mergeOptions(options);

GridLayer.registerJSONType('GridLayer');

var symbolizers = [maptalks.symbolizer.ImageMarkerSymbolizer, maptalks.symbolizer.TextMarkerSymbolizer, maptalks.symbolizer.VectorMarkerSymbolizer, maptalks.symbolizer.VectorPathMarkerSymbolizer];

GridLayer.registerRenderer('canvas', function (_maptalks$renderer$Ca) {
    _inherits(_class, _maptalks$renderer$Ca);

    function _class() {
        _classCallCheck(this, _class);

        return _possibleConstructorReturn(this, _maptalks$renderer$Ca.apply(this, arguments));
    }

    _class.prototype.draw = function draw() {
        var grid = this.layer.getGrid();
        if (!grid) {
            this.completeRender();
            return;
        }
        this.prepareCanvas();
        this._setCanvasStyle(this._compiledGridStyle);
        this._drawGrid();
        this._drawData();
        this.completeRender();
    };

    _class.prototype.checkResources = function checkResources() {
        this._compileStyles();
        if (this._resources) {
            return null;
        }
        var resources = [];
        if (this._compiledGridStyle) {
            resources = maptalks.Util.getExternalResources(this._compiledGridStyle);
        }
        if (this._compiledSymbols) {
            this._compiledSymbols.forEach(function (s) {
                var c = maptalks.Util.getExternalResources(s);
                if (c) {
                    resources = resources.concat(c);
                }
            });
        }
        return resources;
    };

    _class.prototype.redraw = function redraw() {};

    _class.prototype._compileStyles = function _compileStyles() {
        var _this3 = this;

        if (!this._compiledGridStyle) {
            var symbol = maptalks.Util.convertResourceUrl(this.layer.options['symbol']);
            this._compiledGridStyle = maptalks.MapboxUtil.loadFunctionTypes(symbol, function () {
                return [_this3.getMap() ? _this3.getMap().getZoom() : null, null];
            });
        }
        if (!this._compiledSymbols) {
            var map = this.getMap(),
                grid = this.layer.getGrid(),
                data = grid['data'];
            this._compiledSymbols = [];
            if (data) {
                data.forEach(function (gridData, index) {
                    if (!gridData[2]['symbol']) {
                        return;
                    }
                    var argFn = function (props) {
                        return function () {
                            return [map.getZoom(), props];
                        };
                    }(gridData[2]['properties']);
                    var s = maptalks.Util.convertResourceUrl(gridData[2]['symbol']);
                    _this3._compiledSymbols[index] = maptalks.MapboxUtil.loadFunctionTypes(s, argFn);
                });
            }
        }
    };

    _class.prototype._drawGrid = function _drawGrid() {
        var grid = this.layer.getGrid(),
            gridInfo = grid['projection'] ? this._getProjGridToDraw() : this._getGridToDraw();
        if (!gridInfo) {
            return;
        }
        var cols = gridInfo.cols,
            rows = gridInfo.rows,
            cellW = gridInfo.width,
            cellH = gridInfo.height,
            p0 = this._getCellNW(cols[0], rows[0], gridInfo);
        var p1, p2;
        this.context.beginPath();
        if (cellW < 0.5 || cellH < 0.5 || this._compiledGridStyle['polygonOpacity'] > 0 || this._compiledGridStyle['polygonColor'] || this._compiledGridStyle['polygonPatternFile']) {
            p2 = this._getCellNW(cols[1] + 1, rows[1] + 1, gridInfo);
            this.context.rect(p0[0], p0[1], p2[0] - p0[0], p2[1] - p0[1]);
            if (this._compiledGridStyle['polygonOpacity'] > 0) {
                maptalks.Canvas.fillCanvas(this.context, this._compiledGridStyle['polygonOpacity'], p0[0], p0[1]);
            } else {
                maptalks.Canvas.fillCanvas(this.context, 1, p0[0], p0[1]);
            }
            if (cellW < 0.5 || cellH < 0.5) {
                return;
            }
        }
        for (var i = cols[0]; i <= cols[1] + 1; i++) {
            p1 = this._getCellNW(i, rows[0], gridInfo);
            p2 = this._getCellNW(i, rows[1] + 1, gridInfo);
            this.context.moveTo(p1[0], p1[1]);
            this.context.lineTo(p2[0], p2[1]);
        }
        for (var _i = rows[0]; _i <= rows[1] + 1; _i++) {
            p1 = this._getCellNW(cols[0], _i, gridInfo);
            p2 = this._getCellNW(cols[1] + 1, _i, gridInfo);
            this.context.moveTo(p1[0], p1[1]);
            this.context.lineTo(p2[0], p2[1]);
        }
        maptalks.Canvas._stroke(this.context, this._compiledGridStyle['lineOpacity'], p0[0], p0[1]);
    };

    _class.prototype._getProjGridToDraw = function _getProjGridToDraw() {
        var grid = this.layer.getGrid(),
            map = this.getMap(),
            mapSize = map.getSize(),
            res = map._getResolution(),
            gridX = grid.cols || ['*', '*'],
            gridY = grid.rows || ['*', '*'],
            center = map.coordinateToContainerPoint(new maptalks.Coordinate(grid.center)),
            width = grid.width / res,
            height = grid.height / res;
        var delta = 1E-6,
            cxmax = -center.x + mapSize.width,
            cymax = -center.y + mapSize.height;
        var view = new maptalks.PointExtent(-center.x > 0 ? Math.ceil(-center.x / width - delta) - 1 : -Math.ceil(center.x / width - delta), -center.y > 0 ? Math.ceil(-center.y / height - delta) - 1 : -Math.ceil(center.y / height - delta), cxmax > 0 ? Math.ceil(cxmax / width - delta) : -Math.ceil(cxmax / width - delta), cymax > 0 ? Math.ceil(cymax / height - delta) : -Math.ceil(cymax / height - delta));
        var full = new maptalks.PointExtent(
        //xmin, ymin
        gridX[0] === '*' ? view.xmin : gridX[0], gridY[0] === '*' ? view.ymin : gridY[0],
        //xmax, ymax
        gridX[1] === '*' ? view.xmax : gridX[1], gridY[1] === '*' ? view.ymax : gridY[1]);
        var intersection = view.intersection(full);
        if (!intersection) {
            return null;
        }
        return {
            cols: [intersection.xmin, intersection.xmax],
            rows: [intersection.ymin, intersection.ymax],
            width: width,
            height: height,
            center: center
        };
    };

    _class.prototype._getCellNW = function _getCellNW(col, row, gridInfo) {
        var grid = this.layer.getGrid();
        if (grid['projection']) {
            return [gridInfo.center.x + (col > 0 ? col - 1 : col) * gridInfo.width, gridInfo.center.y + (row > 0 ? row - 1 : row) * gridInfo.height];
        }
        return null;
    };

    _class.prototype._getCellCenter = function _getCellCenter(col, row, gridInfo) {
        var grid = this.layer.getGrid();
        if (grid['projection']) {
            return [gridInfo.center.x + ((col > 0 ? col - 1 : col) + 1 / 2) * gridInfo.width, gridInfo.center.y + ((row > 0 ? row - 1 : row) + 1 / 2) * gridInfo.height];
        }
        return null;
    };

    _class.prototype._drawData = function _drawData() {
        var _this4 = this;

        var grid = this.layer.getGrid(),
            gridInfo = grid['projection'] ? this._getProjGridToDraw() : this._getGridToDraw(),
            data = grid['data'];
        if (!Array.isArray(data) || !data.length) {
            return;
        }
        if (!this._gridSymbolTests) {
            this._gridSymbolTests = [];
        }
        data.forEach(function (gridData, index) {
            if (!gridData[2]['symbol']) {
                return;
            }
            _this4._drawDataGrid(gridData, _this4._compiledSymbols[index], gridInfo);
            if (maptalks.Util.isNil(_this4._gridSymbolTests[index])) {
                _this4._gridSymbolTests[index] = _this4._testSymbol(gridData[2]['symbol']);
            }
            if (_this4._gridSymbolTests[index]) {
                _this4._drawDataCenter(gridData, index, gridInfo);
            }
        });
    };

    _class.prototype._drawDataGrid = function _drawDataGrid(gridData, symbol, gridInfo) {
        var map = this.getMap(),
            mapSize = map.getSize(),
            mapExtent = new maptalks.PointExtent(0, 0, mapSize.width, mapSize.height);
        var painted = false;
        var cols = Array.isArray(gridData[0]) ? gridData[0] : [gridData[0], gridData[0]],
            rows = Array.isArray(gridData[1]) ? gridData[1] : [gridData[1], gridData[1]],
            p0 = this._getCellNW(cols[0], rows[0], gridInfo);
        var p1, p2, gridExtent;
        for (var i = cols[0]; i <= cols[1]; i++) {
            for (var ii = rows[0]; ii <= rows[1]; ii++) {
                p1 = this._getCellNW(i, ii, gridInfo);
                p2 = this._getCellNW(i + 1, ii + 1, gridInfo);
                gridExtent = new maptalks.PointExtent(p1[0], p1[1], p2[0], p2[1]);
                if (!mapExtent.intersects(gridExtent)) {
                    continue;
                }
                if (!painted) {
                    painted = true;
                    this._setCanvasStyle(symbol);
                    this.context.beginPath();
                }
                this.context.rect(Math.ceil(p1[0]), Math.ceil(p1[1]), Math.ceil(p2[0] - p1[0]), Math.ceil(p2[1] - p1[1]));
            }
        }
        if (painted) {
            maptalks.Canvas.fillCanvas(this.context, symbol['polygonOpacity'], p0[0], p0[1]);
        }
    };

    _class.prototype._testSymbol = function _testSymbol(symbol) {
        for (var i = symbolizers.length - 1; i >= 0; i--) {
            if (symbolizers[i].test(symbol)) {
                return true;
            }
        }
        return false;
    };

    _class.prototype._drawDataCenter = function _drawDataCenter(gridData, index, gridInfo) {
        var symbol = gridData[2]['symbol'];
        var map = this.getMap(),
            extent = map.getExtent();
        var dataMarkers = this._dataMarkers;
        if (!dataMarkers) {
            this._dataMarkers = dataMarkers = [];
        }
        var coordinates = [];
        var cols = Array.isArray(gridData[0]) ? gridData[0] : [gridData[0], gridData[0]],
            rows = Array.isArray(gridData[1]) ? gridData[1] : [gridData[1], gridData[1]];
        var p, c;
        for (var i = cols[0]; i <= cols[1]; i++) {
            for (var ii = rows[0]; ii <= rows[1]; ii++) {
                p = this._getCellCenter(i, ii, gridInfo);
                c = map.containerPointToCoordinate(new maptalks.Point(p));
                if (extent.contains(c)) {
                    coordinates.push(c);
                }
            }
        }
        if (coordinates.length === 0) {
            return;
        }
        var line = dataMarkers[index];
        if (!line) {
            var lineSymbol = maptalks.Util.extend({}, symbol);
            lineSymbol['markerPlacement'] = 'point';
            lineSymbol['textPlacement'] = 'point';
            lineSymbol['lineOpacity'] = 0;
            lineSymbol['polygonOpacity'] = 0;
            line = new maptalks.LineString(coordinates, {
                'symbol': lineSymbol,
                'properties': gridData[2]['properties'],
                'debug': this.layer.options['debug']
            });
            line._bindLayer(this.layer);
            dataMarkers[index] = line;
        } else {
            line.setCoordinates(coordinates);
        }
        line._getPainter().paint();
    };

    _class.prototype._setCanvasStyle = function _setCanvasStyle(symbol) {
        var s = maptalks.Util.extend({}, defaultSymbol, symbol);
        maptalks.Canvas.prepareCanvas(this.context, s, this._resources);
    };

    _class.prototype.onRemove = function onRemove() {
        delete this._compiledGridStyle;
        delete this._compiledSymbols;
        delete this._gridSymbolTests;
        delete this._dataMarkers;
    };

    return _class;
}(maptalks.renderer.CanvasRenderer));

exports.GridLayer = GridLayer;

Object.defineProperty(exports, '__esModule', { value: true });

})));

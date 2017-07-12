/*!
 * maptalks.gridlayer v0.1.0
 * LICENSE : MIT
 * (c) 2016-2017 maptalks.org
 */
/*!
 * requires maptalks@^0.26.2 
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('maptalks')) :
	typeof define === 'function' && define.amd ? define(['exports', 'maptalks'], factory) :
	(factory((global.maptalks = global.maptalks || {}),global.maptalks));
}(this, (function (exports,maptalks) { 'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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
        cols      : [1, Infinity],
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

        if (!grid['unit']) {
            grid['unit'] = 'projection';
        }
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

    GridLayer.prototype.getGridProjection = function getGridProjection() {
        if (this.options['projectionName']) {
            return maptalks.projection[this.options['projectionName'].toUpperCase()];
        } else {
            return this.getMap().getProjection();
        }
    };

    /**
     * Get grid's geographic exteng
     * @return {Extent}
     */


    GridLayer.prototype.getGridExtent = function getGridExtent() {
        var _this2 = this;

        var grid = this.getGrid(),
            center = new maptalks.Coordinate(grid.center),
            map = this.getMap(),
            w = grid.width,
            h = grid.height,
            cols = grid.cols || [-Infinity, Infinity],
            rows = grid.rows || [-Infinity, Infinity];
        if (grid['unit'] === 'projection') {
            var _ret = function () {
                // meters in projected coordinate system
                var projection$$1 = _this2.getGridProjection(),
                    pcenter = projection$$1.project(center);
                var xmin = pcenter.x + cols[0] * w,
                    xmax = pcenter.x + cols[1] * w,
                    ymin = pcenter.y + cols[0] * h,
                    ymax = pcenter.y + cols[1] * h;
                return {
                    v: new maptalks.Extent(xmin, ymin, xmax, ymax).convertTo(function (c) {
                        return projection$$1.unproject(c);
                    })
                };
            }();

            if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        } else if (grid['unit'] === 'meter') {
            // distance in geographic meters
            var sw = map.locate(center, -w * cols[0], -h * rows[0]),
                ne = map.locate(center, w * cols[1], h * rows[1]);
            return new maptalks.Extent(sw, ne);
        } else if (grid['unit'] === 'degree') {
            var _sw = center.add(w * cols[0], h * rows[0]),
                _ne = center.add(w * cols[1], h * rows[1]);
            return new maptalks.Extent(_sw, _ne);
        }
        return null;
    };

    /**
     * Get cell index at coordinate
     * @param  {Coordinate} coordinate
     * @return {Object}
     * @private
     */


    GridLayer.prototype.getCellAt = function getCellAt(coordinate) {
        var grid = this.getGrid(),
            map = this.getMap(),
            extent = this.getGridExtent();
        if (!extent.contains(coordinate)) {
            return null;
        }
        var gridCenter = new maptalks.Coordinate(grid.center);
        if (grid['unit'] === 'projection') {
            var center = map.coordinateToPoint(gridCenter),
                size = getCellPointSize(this, grid);
            var p = map.coordinateToPoint(coordinate),
                col = Math.floor((p.x - center.x) / size[0]),
                row = Math.floor((p.y - center.y) / size[0]);
            return [col, row];
        } else if (grid['unit'] === 'meter') {
            var distX = map.computeLength(new maptalks.Coordinate(coordinate.x, gridCenter.y), gridCenter),
                _col = Math.floor(distX / grid.width);
            var distY = map.computeLength(new maptalks.Coordinate(gridCenter.x, coordinate.y), gridCenter),
                _row = Math.floor(distY / grid.height);
            return [_col, _row];
        } else if (grid['unit'] === 'degree') {
            var _distX = coordinate.x - gridCenter.x,
                _col2 = Math.floor(_distX / grid.width);
            var _distY = coordinate.y - gridCenter.y,
                _row2 = Math.floor(_distY / grid.height);
            return [_col2, _row2];
        }
        return null;
    };

    GridLayer.prototype.getCellGeometry = function getCellGeometry(col, row) {
        var map = this.getMap(),
            grid = this.getGrid();
        var gridCenter = new maptalks.Coordinate(grid.center);
        if (grid['unit'] === 'projection') {
            var center = map.coordinateToPoint(gridCenter),
                size = getCellPointSize(this, grid),
                width = size[0],
                height = size[1];
            var cnw = center.add(width * col, height * row);
            var nw = map.pointToCoordinate(cnw),
                ne = map.pointToCoordinate(cnw.add(width, 0)),
                sw = map.pointToCoordinate(cnw.add(0, height));
            var w = map.computeLength(nw, ne),
                h = map.computeLength(nw, sw);
            return new maptalks.Rectangle(nw, w, h);
        } else if (grid['unit'] === 'meter') {
            return null;
        } else if (grid['unit'] === 'degree') {
            return gridCenter.add(grid.width * col, grid.height * row);
        }
        return null;
    };

    /**
     * 变形虫
     * @param  {Rect} startCell 开始网格
     * @return {Array}  结果网格数组
     */


    GridLayer.prototype.visitAround = function visitAround(coordinate, cb) {
        var grid = this.getGrid(),
            gridData = grid.data;
        if (!coordinate || !grid.data || !cb) {
            return;
        }
        var data = [];
        for (var i = 0; i < gridData.length; i++) {
            var cols = gridData[i][0],
                rows = gridData[i][1];
            var value = gridData[i][2];
            if (!Array.isArray(cols)) {
                cols = [cols, cols];
            }
            if (!Array.isArray(rows)) {
                rows = [rows, rows];
            }
            for (var ii = cols[0]; ii <= cols[1]; ii++) {
                for (var iii = rows[0]; iii <= rows[1]; iii++) {
                    data.push([ii, iii, value]);
                }
            }
        }
        if (!data.length) {
            return;
        }

        var startCell = this.getCellAt(coordinate);
        //根据与开始网格的距离对所有网格排序
        var sorted = data.sort(function (a, b) {
            return Math.pow(a[0] - startCell[0], 2) + Math.pow(a[1] - startCell[1], 2) - Math.pow(b[0] - startCell[0], 2) - Math.pow(b[1] - startCell[1], 2);
        });

        for (var _i = 0, l = sorted.length; _i < l; _i++) {
            if (cb(sorted[_i]) === false) {
                break;
            }
        }
    };

    GridLayer.prototype.identify = function identify(coordinate) {
        if (!coordinate) {
            return null;
        }
        var extent = this.getGridExtent();
        if (!extent.contains(coordinate)) {
            return null;
        }
        var idx = this.getCellAt(coordinate);
        var rectangle = this.getCellGeometry(idx[0], idx[1]);
        return {
            col: idx[0],
            row: idx[1],
            geometry: rectangle
        };
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

    _class.prototype.needToRedraw = function needToRedraw() {
        var map = this.getMap();
        if (!map.getPitch() && map.isZooming()) {
            return false;
        }
        return _maptalks$renderer$Ca.prototype.needToRedraw.call(this);
    };

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

    _class.prototype.drawOnInteracting = function drawOnInteracting() {
        this.draw();
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

    _class.prototype.redraw = function redraw() {
        this.setToRedraw();
    };

    _class.prototype._compileStyles = function _compileStyles() {
        var _this4 = this;

        if (!this._compiledGridStyle) {
            var symbol = maptalks.Util.convertResourceUrl(this.layer.options['symbol']);
            this._compiledGridStyle = maptalks.MapboxUtil.loadFunctionTypes(symbol, function () {
                return [_this4.getMap() ? _this4.getMap().getZoom() : null, null];
            });
        }
        if (!this._compiledSymbols) {
            (function () {
                var map = _this4.getMap(),
                    grid = _this4.layer.getGrid(),
                    data = grid['data'];
                _this4._compiledSymbols = [];
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
                        _this4._compiledSymbols[index] = maptalks.MapboxUtil.loadFunctionTypes(s, argFn);
                    });
                }
            })();
        }
    };

    _class.prototype._drawGrid = function _drawGrid() {
        var grid = this.layer.getGrid(),
            gridInfo = grid['unit'] === 'projection' ? this._getProjGridToDraw() : this._getGridToDraw();
        if (!gridInfo || this._compiledGridStyle.lineOpacity <= 0 || this._compiledGridStyle.lineWidth <= 0) {
            return;
        }
        var cols = gridInfo.cols,
            rows = gridInfo.rows,
            width = gridInfo.width,
            height = gridInfo.height,
            p0 = this._getCellNW(cols[0], rows[0], gridInfo);
        var p1 = void 0,
            p2 = void 0;
        this.context.beginPath();
        if (width < 0.5 || height < 0.5 || this._compiledGridStyle['polygonOpacity'] > 0 || this._compiledGridStyle['polygonColor'] || this._compiledGridStyle['polygonPatternFile']) {
            p2 = this._getCellNW(cols[1] + 1, rows[1] + 1, gridInfo);
            this.context.rect(p0.x, p0.y, p2.x - p0.x, p2.y - p0.y);
            if (this._compiledGridStyle['polygonOpacity'] > 0) {
                maptalks.Canvas.fillCanvas(this.context, this._compiledGridStyle['polygonOpacity'], p0.x, p0.y);
            } else {
                maptalks.Canvas.fillCanvas(this.context, 1, p0.x, p0.y);
            }
            if (width < 0.5 || height < 0.5) {
                return;
            }
        }
        for (var i = cols[0]; i <= cols[1]; i++) {
            p1 = this._getCellNW(i, rows[0], gridInfo);
            p2 = this._getCellNW(i, rows[1], gridInfo);
            this.context.moveTo(p1.x, p1.y);
            this.context.lineTo(p2.x, p2.y);
        }
        for (var _i2 = rows[0]; _i2 <= rows[1]; _i2++) {
            p1 = this._getCellNW(cols[0], _i2, gridInfo);
            p2 = this._getCellNW(cols[1], _i2, gridInfo);
            this.context.moveTo(p1.x, p1.y);
            this.context.lineTo(p2.x, p2.y);
        }
        maptalks.Canvas._stroke(this.context, this._compiledGridStyle['lineOpacity'], p0.x, p0.y);
    };

    _class.prototype._getProjGridToDraw = function _getProjGridToDraw() {
        var grid = this.layer.getGrid(),
            map = this.getMap(),

        // projection = map.getProjection(),
        extent = map._get2DExtent(),
            gridX = grid.cols || [-Infinity, Infinity],
            gridY = grid.rows || [-Infinity, Infinity],
            gridCenter = new maptalks.Coordinate(grid.center),
            center = map.coordinateToPoint(gridCenter),
            size = getCellPointSize(this.layer, grid),
            width = size[0],
            height = size[1];
        var gridExtent = new maptalks.PointExtent(center.x + gridX[0] * width, center.y + gridY[0] * height, center.x + gridX[1] * width, center.y + gridY[1] * height);
        var intersection = extent.intersection(gridExtent);
        if (!intersection) {
            return null;
        }
        var delta = 1E-6;
        var cols = [-Math.ceil((center.x - intersection.xmin - delta) / width), Math.ceil((intersection.xmax - center.x - delta) / width)];
        var rows = [-Math.ceil((center.y - intersection.ymin - delta) / height), Math.ceil((intersection.ymax - center.y - delta) / height)];
        return {
            cols: cols,
            rows: rows,
            width: Math.round(width),
            height: Math.round(height),
            center: center
        };
    };

    _class.prototype._getGridToDraw = function _getGridToDraw() {
        var grid = this.layer.getGrid(),
            map = this.getMap(),

        // projection = map.getProjection(),
        extent = map.getExtent(),
            gridCenter = new maptalks.Coordinate(grid.center),
            gridExtent = this.layer.getGridExtent(),
            w = grid.width,
            h = grid.height;

        var intersection = extent.intersection(gridExtent);
        if (!intersection) {
            return null;
        }
        var delta = 1E-6;
        var cols = void 0,
            rows = void 0;
        if (grid['unit'] === 'meter') {
            var dx1 = map.computeLength(new maptalks.Coordinate(intersection.xmin, gridCenter.y), gridCenter),
                dx2 = map.computeLength(new maptalks.Coordinate(intersection.xmax, gridCenter.y), gridCenter);
            var dy1 = map.computeLength(new maptalks.Coordinate(gridCenter.y, intersection.ymin), gridCenter),
                dy2 = map.computeLength(new maptalks.Coordinate(intersection.ymax, gridCenter.y), gridCenter);
            cols = [-Math.ceil(dx1 / grid.width), Math.ceil(dx2 / grid.width)];
            rows = [-Math.ceil(dy1 / grid.height), Math.ceil(dy2 / grid.height)];
        } else if (grid['unit'] === 'degree') {
            cols = [-Math.ceil((gridCenter.x - intersection.xmin - delta) / w), Math.ceil((intersection.xmax - gridCenter.x - delta) / w)];
            rows = [-Math.ceil((gridCenter.y - intersection.ymin - delta) / h), Math.ceil((intersection.ymax - gridCenter.y - delta) / h)];
        }

        return {
            cols: cols,
            rows: rows,
            center: gridCenter
        };
    };

    _class.prototype._getCellNW = function _getCellNW(col, row, gridInfo) {
        var map = this.getMap(),
            grid = this.layer.getGrid();
        if (grid['unit'] === 'projection') {
            var p = new maptalks.Point(gridInfo.center.x + col * gridInfo.width, gridInfo.center.y + row * gridInfo.height);
            return map._pointToContainerPoint(p)._floor();
        } else if (grid['unit'] === 'meter') {
            var center = new maptalks.Coordinate(grid.center);
            var target = map.locate(center, grid.width * col, grid.height * row);
            return map.coordinateToContainerPoint(target)._floor();
        } else if (grid['unit'] === 'degree') {
            var _center = new maptalks.Coordinate(grid.center);
            var _target = _center.add(col * grid.width, row * grid.height);
            return map.coordinateToContainerPoint(_target)._floor();
        }
        return null;
    };

    _class.prototype._getCellCenter = function _getCellCenter(col, row, gridInfo) {
        var grid = this.layer.getGrid(),
            map = this.getMap();
        if (grid['unit'] === 'projection') {
            var p = new maptalks.Point(gridInfo.center.x + (col + 1 / 2) * gridInfo.width, gridInfo.center.y + (row + 1 / 2) * gridInfo.height);
            return map.pointToCoordinate(p);
        } else if (grid['unit'] === 'meter') {
            var center = new maptalks.Coordinate(grid.center);
            return map.locate(center, grid.width * (col + 1 / 2), grid.height * (row + 1 / 2));
        } else if (grid['unit'] === 'degree') {
            var _center2 = new maptalks.Coordinate(grid.center);
            return _center2.add(grid.width * (col + 1 / 2), grid.height * (row + 1 / 2));
        }
        return null;
    };

    _class.prototype._drawData = function _drawData() {
        var _this5 = this;

        var grid = this.layer.getGrid(),
            gridInfo = grid['unit'] === 'projection' ? this._getProjGridToDraw() : this._getGridToDraw(),
            data = grid['data'];
        if (!gridInfo || !Array.isArray(data) || !data.length) {
            return;
        }
        if (!this._gridSymbolTests) {
            this._gridSymbolTests = [];
        }
        data.forEach(function (gridData, index) {
            if (!gridData[2]['symbol']) {
                return;
            }
            _this5._drawDataGrid(gridData, _this5._compiledSymbols[index], gridInfo);
            if (maptalks.Util.isNil(_this5._gridSymbolTests[index])) {
                _this5._gridSymbolTests[index] = _this5._testSymbol(gridData[2]['symbol']);
            }
            if (_this5._gridSymbolTests[index]) {
                _this5._drawDataCenter(gridData, index, gridInfo);
            }
        });
    };

    _class.prototype._drawDataGrid = function _drawDataGrid(gridData, symbol, gridInfo) {
        var ctx = this.context,
            map = this.getMap(),
            mapExtent = map.getContainerExtent();
        var painted = false;
        var cols = Array.isArray(gridData[0]) ? gridData[0] : [gridData[0], gridData[0]],
            rows = Array.isArray(gridData[1]) ? gridData[1] : [gridData[1], gridData[1]],
            p0 = this._getCellNW(cols[0], rows[0], gridInfo);
        var p1 = void 0,
            p2 = void 0,
            p3 = void 0,
            p4 = void 0,
            gridExtent = void 0;
        for (var i = cols[0]; i <= cols[1]; i++) {
            for (var ii = rows[0]; ii <= rows[1]; ii++) {
                p1 = this._getCellNW(i, ii, gridInfo);
                p2 = this._getCellNW(i + 1, ii, gridInfo);
                p3 = this._getCellNW(i + 1, ii + 1, gridInfo);
                p4 = this._getCellNW(i, ii + 1, gridInfo);
                gridExtent = new maptalks.PointExtent(p1.x, p1.y, p3.x, p3.y);
                // marker as an invalid grid if width or height is abnormally large, due to containerPoint conversion
                if (gridExtent.getWidth() > 1E4 || gridExtent.getHeight() > 1E4 || !mapExtent.intersects(gridExtent)) {
                    continue;
                }
                if (!painted) {
                    painted = true;
                    this._setCanvasStyle(symbol);
                    ctx.beginPath();
                }
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.lineTo(p4.x, p4.y);
                ctx.closePath();
            }
        }
        if (painted) {
            maptalks.Canvas.fillCanvas(ctx, symbol['polygonOpacity'], p0.x, p0.y);
            maptalks.Canvas._stroke(ctx, symbol['lineOpacity']);
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
        if (!Array.isArray(gridData[0]) && !Array.isArray(gridData[1])) {
            var p = this._getCellCenter(gridData[0], gridData[1], gridInfo);
            if (extent.contains(p)) {
                coordinates.push(p);
            }
        } else {
            var cols = Array.isArray(gridData[0]) ? gridData[0] : [gridData[0], gridData[0]],
                rows = Array.isArray(gridData[1]) ? gridData[1] : [gridData[1], gridData[1]];
            for (var i = cols[0]; i <= cols[1]; i++) {
                for (var ii = rows[0]; ii <= rows[1]; ii++) {
                    var _p = this._getCellCenter(i, ii, gridInfo);
                    if (extent.contains(_p)) {
                        coordinates.push(_p);
                    }
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

function getCellPointSize(layer, grid) {
    var projection$$1 = layer.getGridProjection(),
        map = layer.getMap(),
        gridCenter = new maptalks.Coordinate(grid.center),
        center = map.coordinateToPoint(gridCenter),
        target = projection$$1.project(gridCenter)._add(grid.width, grid.height),
        ptarget = map._prjToPoint(target),
        width = Math.abs(ptarget.x - center.x),
        height = Math.abs(ptarget.y - center.y);
    return [width, height];
}

exports.GridLayer = GridLayer;

Object.defineProperty(exports, '__esModule', { value: true });

typeof console !== 'undefined' && console.log('maptalks.gridlayer v0.1.0, requires maptalks@^0.26.2.');

})));

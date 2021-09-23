/*!
 * maptalks.gridlayer v0.6.8
 * LICENSE : MIT
 * (c) 2016-2021 maptalks.org
 */
/*!
 * requires maptalks@<2.0.0 
 */
import { Browser, Canvas, Coordinate, Extent, Layer, LineString, MapboxUtil, Point, PointExtent, Rectangle, Util, VectorLayer, projection, renderer, symbolizer } from 'maptalks';

function getCellPointSize(layer, grid) {
    var projection$$1 = layer.getGridProjection(),
        map = layer.getMap(),
        gridCenter = new Coordinate(grid.center),
        center = map.coordinateToPoint(gridCenter),
        target = projection$$1.project(gridCenter)._add(grid.width, grid.height),
        ptarget = map._prjToPoint(target),
        width = Math.abs(ptarget.x - center.x),
        height = Math.abs(ptarget.y - center.y);
    return [width, height];
}

var defaultSymbol = {
    'lineColor': '#bbb',
    'lineWidth': 1,
    'lineOpacity': 1,
    'lineDasharray': [],
    'lineCap': 'butt',
    'lineJoin': 'round',
    'polygonOpacity': 0
};

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};











var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass);
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var options = {
    'symbol': Util.extend({}, defaultSymbol),
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
        unit : 'projection' ,   // 网格的单位: projection指投影坐标, meter指真实距离, degree指经纬度
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
    inherits(GridLayer, _maptalks$Layer);

    GridLayer.getPainterClass = function getPainterClass() {
        return VectorLayer.getPainterClass();
    };

    function GridLayer(id, grids, options) {
        classCallCheck(this, GridLayer);

        var _this = possibleConstructorReturn(this, _maptalks$Layer.call(this, id, options));

        if (!grids) {
            _this._gridCenters = [];
            _this._grids = [];
            return possibleConstructorReturn(_this);
        }
        if (!Array.isArray(grids)) {
            grids = [grids];
        }

        grids.forEach(function (grid) {
            if (!grid['unit']) {
                grid['unit'] = 'projection';
            }
            if (grid.center.toArray) {
                grid.center = grid.center.toArray();
            }
        });
        _this._gridCenters = grids.map(function (grid) {
            return grid.center.slice(0);
        });
        _this._grids = grids;
        return _this;
    }

    GridLayer.prototype.getGridCount = function getGridCount() {
        if (!this._grids) {
            return 0;
        }
        return this._grids.length;
    };

    /**
     * Get grid at given index
     * @return {Object} grid object
     */


    GridLayer.prototype.getGrid = function getGrid() {
        var gridIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

        var grid = this._grids[gridIndex];
        if (!grid) {
            return null;
        }
        var offset = grid['offset'];
        if (offset) {
            if (Util.isFunction(offset)) {
                offset = offset();
            }
            grid.center[0] = this._gridCenters[gridIndex][0] + offset[0];
            grid.center[1] = this._gridCenters[gridIndex][1] + offset[1];
        }
        return grid;
    };

    GridLayer.prototype.setGrid = function setGrid(grid) {
        var gridIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

        if (!grid['unit']) {
            grid['unit'] = 'projection';
        }
        if (grid.center.toArray) {
            grid.center = grid.center.toArray();
        }
        this._gridCenters[gridIndex] = grid.center.slice(0);
        this._grids[gridIndex] = grid;
        return this.redraw();
    };

    GridLayer.prototype.setGridData = function setGridData(data) {
        var gridIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

        this._grids[gridIndex].data = data;
        return this.redraw();
    };

    GridLayer.prototype.redraw = function redraw() {
        var renderer$$1 = this._getRenderer();
        if (!renderer$$1) {
            return this;
        }
        renderer$$1.redraw();
        return this;
    };

    GridLayer.prototype.isEmpty = function isEmpty() {
        var gridIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

        if (!this._grids || !this._grids[gridIndex]) {
            return true;
        }
        return false;
    };

    GridLayer.prototype.clear = function clear() {
        delete this._grids;
        this.fire('clear');
        return this.redraw();
    };

    GridLayer.prototype.getGridProjection = function getGridProjection() {
        if (this.options['projectionName']) {
            return projection[this.options['projectionName'].toUpperCase()];
        } else {
            return this.getMap().getProjection();
        }
    };

    /**
     * Get grid's geographic exteng
     * @param {Number} [gridIndex=0] - grid's gridIndex
     * @return {Extent}
     */


    GridLayer.prototype.getGridExtent = function getGridExtent() {
        var gridIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

        var grid = this.getGrid(gridIndex),
            center = new Coordinate(grid.center),
            map = this.getMap(),
            w = grid.width,
            h = grid.height,
            cols = grid.cols || [-Infinity, Infinity],
            rows = grid.rows || [-Infinity, Infinity];
        if (Util.isNil(cols[0])) cols[0] = -Infinity;
        if (Util.isNil(cols[1])) cols[1] = Infinity;
        if (Util.isNil(rows[0])) rows[0] = -Infinity;
        if (Util.isNil(rows[1])) rows[1] = Infinity;
        if (grid['unit'] === 'projection') {
            // meters in projected coordinate system
            var projection$$1 = this.getGridProjection(),
                pcenter = projection$$1.project(center);
            var xmin = pcenter.x + cols[0] * w,
                xmax = pcenter.x + cols[1] * w,
                ymin = pcenter.y + cols[0] * h,
                ymax = pcenter.y + cols[1] * h;
            var fullExtent = map.getFullExtent();
            if (xmin === -Infinity) {
                xmin = fullExtent['xmin'] + 1;
            }
            if (xmax === Infinity) {
                xmax = fullExtent['xmax'];
            }
            if (ymin === -Infinity) {
                ymin = fullExtent['ymin'];
            }
            if (ymax === Infinity) {
                ymax = fullExtent['ymax'];
            }
            return new Extent(xmin, ymin, xmax, ymax).convertTo(function (c) {
                return projection$$1.unproject(c);
            });
        } else if (grid['unit'] === 'meter') {
            // distance in geographic meters
            var sw = map.locate(center, w * cols[0], -h * rows[0]),
                ne = map.locate(center, w * cols[1], -h * rows[1]);
            return new Extent(sw, ne);
        } else if (grid['unit'] === 'degree') {
            var _sw = center.add(w * cols[0], h * rows[0]),
                _ne = center.add(w * cols[1], h * rows[1]);
            return new Extent(_sw, _ne);
        }
        return null;
    };

    /**
     * Get cell index at coordinate
     * @param  {Coordinate} coordinate
     * @param  {Number} gridIndex
     * @return {Object}
     * @private
     */


    GridLayer.prototype.getCellAt = function getCellAt(coordinate) {
        var gridIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

        var grid = this.getGrid(gridIndex),
            map = this.getMap(),
            extent = this.getGridExtent(gridIndex);
        if (!extent.contains(coordinate)) {
            return null;
        }
        var gridCenter = new Coordinate(grid.center);
        if (grid['unit'] === 'projection') {
            var center = map.coordinateToPoint(gridCenter),
                size = getCellPointSize(this, grid);
            var p = map.coordinateToPoint(coordinate),
                col = Math.floor((p.x - center.x) / size[0]),
                row = Math.floor((p.y - center.y) / size[0]);
            return [col, row];
        } else if (grid['unit'] === 'meter') {
            var distX = map.computeLength(new Coordinate(coordinate.x, gridCenter.y), gridCenter),
                _col = Math.floor(distX / grid.width);
            var distY = map.computeLength(new Coordinate(gridCenter.x, coordinate.y), gridCenter),
                _row = Math.floor(distY / grid.height);
            var dx = coordinate.x > gridCenter.x ? 1 : -1;
            var dy = coordinate.y > gridCenter.y ? -1 : 1;
            return [_col * dx, _row * dy];
        } else if (grid['unit'] === 'degree') {
            var _distX = coordinate.x - gridCenter.x,
                _col2 = Math.floor(_distX / grid.width);
            var _distY = coordinate.y - gridCenter.y,
                _row2 = Math.floor(_distY / grid.height);
            return [_col2, _row2];
        }
        return null;
    };

    /**
     * Get cell's geometry
     * @param {Number} col cell col
     * @param {Number} row cell row
     * @param  {Number} gridIndex
     * @returns {maptalks.Geometry}
     */


    GridLayer.prototype.getCellGeometry = function getCellGeometry(col, row) {
        var gridIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

        var map = this.getMap(),
            grid = this.getGrid(gridIndex);
        var gridCenter = new Coordinate(grid.center);
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
            return new Rectangle(nw, w, h);
        } else if (grid['unit'] === 'meter') {
            var _width = grid.width,
                _height = grid.height;

            var _nw = map.locate(gridCenter, col * _width, -row * _height);
            return new Rectangle(_nw, _width, _height);
        } else if (grid['unit'] === 'degree') {
            var _width2 = grid.width,
                _height2 = grid.height;

            var _nw2 = gridCenter.add(col * _width2, -row * _height2);
            var _ne2 = _nw2.add(_width2, 0);
            var _sw2 = _nw2.add(0, -_height2);
            var _w = map.computeLength(_nw2, _ne2),
                _h = map.computeLength(_nw2, _sw2);
            return new Rectangle(_nw2, _w, _h);
        }
        return null;
    };

    /**
     * Visit data cells around given coordinate
     * @param  {maptalks.Coordinate} coordinate
     * @param {Function}  cb  callback function, parameter is [col, row, { properties, symbol }], return false to break the visiting
     * @param  {Number} gridIndex
     */


    GridLayer.prototype.visitAround = function visitAround(coordinate, cb) {
        var gridIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

        var grid = this.getGrid(gridIndex),
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

        var startCell = this.getCellAt(coordinate, gridIndex);
        if (!startCell) {
            return;
        }
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

    /**
     * Return cell index and cell geometry at coordinate
     * @param {maptalks.Coordinate} coordinate coordinate
     * @param  {Number} gridIndex
     * @returns {Object} { col : col, row : row, geometry : cellGeometry }
     */


    GridLayer.prototype.identify = function identify(coordinate) {
        var gridIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

        if (!coordinate) {
            return null;
        }
        var extent = this.getGridExtent(gridIndex);
        if (!extent.contains(coordinate)) {
            return null;
        }
        var idx = this.getCellAt(coordinate, gridIndex);
        var rectangle = this.getCellGeometry(idx[0], idx[1], gridIndex);
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
        var grid = this._grids;
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
}(Layer);

GridLayer.mergeOptions(options);

GridLayer.registerJSONType('GridLayer');

var symbolizers = [symbolizer.ImageMarkerSymbolizer, symbolizer.TextMarkerSymbolizer, symbolizer.VectorMarkerSymbolizer, symbolizer.VectorPathMarkerSymbolizer];

var GridCanvasRenderer = function (_maptalks$renderer$Ca) {
    inherits(GridCanvasRenderer, _maptalks$renderer$Ca);

    function GridCanvasRenderer() {
        classCallCheck(this, GridCanvasRenderer);
        return possibleConstructorReturn(this, _maptalks$renderer$Ca.apply(this, arguments));
    }

    GridCanvasRenderer.prototype.needToRedraw = function needToRedraw() {
        var map = this.getMap();
        if (!map.getPitch() && map.isZooming()) {
            return false;
        }
        return _maptalks$renderer$Ca.prototype.needToRedraw.call(this);
    };

    GridCanvasRenderer.prototype.draw = function draw() {
        var grid = this.layer.getGrid(0);
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

    GridCanvasRenderer.prototype.drawOnInteracting = function drawOnInteracting() {
        this.draw();
    };

    GridCanvasRenderer.prototype.checkResources = function checkResources() {
        this._compileStyles();
        if (this._resources) {
            return null;
        }
        var resources = [];
        if (this._compiledGridStyle) {
            resources = Util.getExternalResources(this._compiledGridStyle);
        }
        if (this._compiledSymbols) {
            for (var i = 0; i < this._compiledSymbols.length; i++) {
                var gridSymbols = this._compiledSymbols[i];
                for (var ii = 0; ii < gridSymbols.length; ii++) {
                    var c = Util.getExternalResources(gridSymbols[ii]);
                    if (c) {
                        resources = resources.concat(c);
                    }
                }
            }
        }
        return resources;
    };

    GridCanvasRenderer.prototype.redraw = function redraw() {
        this.reset();
        this.setToRedraw();
    };

    GridCanvasRenderer.prototype.reset = function reset() {
        delete this._compiledSymbols;
    };

    GridCanvasRenderer.prototype._compileStyles = function _compileStyles() {
        var _this2 = this;

        if (!this._compiledGridStyle) {
            var symbol = Util.convertResourceUrl(this.layer.options['symbol']);
            this._compiledGridStyle = MapboxUtil.loadFunctionTypes(symbol, function () {
                return [_this2.getMap() ? _this2.getMap().getZoom() : null, null];
            });
        }
        if (!this._compiledSymbols) {
            (function () {
                var map = _this2.getMap(),
                    gridCount = _this2.layer.getGridCount();
                _this2._compiledSymbols = [];

                var _loop = function _loop(i) {
                    var grid = _this2.layer.getGrid(i),
                        data = grid['data'];
                    _this2._compiledSymbols[i] = [];
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
                            var s = Util.convertResourceUrl(gridData[2]['symbol']);
                            _this2._compiledSymbols[i][index] = MapboxUtil.loadFunctionTypes(s, argFn);
                        });
                    }
                };

                for (var i = 0; i < gridCount; i++) {
                    _loop(i);
                }
            })();
        }
    };

    GridCanvasRenderer.prototype._preDrawGrid = function _preDrawGrid() {
        var map = this.getMap();
        var count = this.layer.getGridCount();
        var gridInfos = [];
        for (var i = 0; i < count; i++) {
            var grid = this.layer.getGrid(i),
                gridInfo = grid['unit'] === 'projection' ? this._getProjGridToDraw(grid, i) : this._getGridToDraw(grid, i);
            if (!gridInfo || this._compiledGridStyle.lineOpacity <= 0 || this._compiledGridStyle.lineWidth <= 0) {
                gridInfos.push(null);
                continue;
            }
            var cols = gridInfo.cols,
                rows = gridInfo.rows;
            var p0 = this._getCellNW(cols[0], rows[0], gridInfo);
            if (map.getPitch() === 0) {
                var p1 = this._getCellNW(cols[0] + 1, rows[0] + 1, gridInfo);
                var width = Math.abs(p0.x - p1.x);
                var height = Math.abs(p0.y - p1.y);
                if (width < 0.5 || height < 0.5 || this._compiledGridStyle['polygonOpacity'] > 0 || this._compiledGridStyle['polygonColor'] || this._compiledGridStyle['polygonPatternFile']) {
                    var p2 = this._getCellNW(cols[1] + 1, rows[0], gridInfo);
                    var p3 = this._getCellNW(cols[1] + 1, rows[1] + 1, gridInfo);
                    var p4 = this._getCellNW(cols[0], rows[1] + 1, gridInfo);
                    this.context.beginPath();
                    // this.context.rect(p0.x, p0.y, p2.x - p0.x, p2.y - p0.y);
                    this.context.moveTo(p0.x, p0.y);
                    this.context.lineTo(p2.x, p2.y);
                    this.context.lineTo(p3.x, p3.y);
                    this.context.lineTo(p4.x, p4.y);
                    this.context.closePath();

                    this.context.fillStyle = this._compiledGridStyle.lineColor;
                    if (this._compiledGridStyle['polygonOpacity'] > 0) {
                        Canvas.fillCanvas(this.context, this._compiledGridStyle['polygonOpacity'], p0.x, p0.y);
                    } else {
                        Canvas.fillCanvas(this.context, 1, p0.x, p0.y);
                    }
                    if (width < 0.5 || height < 0.5) {
                        gridInfos.push(null);
                        continue;
                    }
                }
            }
            gridInfos.push({
                cols: cols,
                rows: rows,
                gridInfo: gridInfo,
                p0: p0
            });
        }
        return gridInfos;
    };

    GridCanvasRenderer.prototype._drawGrid = function _drawGrid() {
        var colRows = this._preDrawGrid();
        for (var i = 0; i < colRows.length; i++) {
            var colRow = colRows[i];
            if (!colRow) {
                continue;
            }
            this.context.beginPath();
            var cols = colRow['cols'],
                rows = colRow['rows'],
                gridInfo = colRow['gridInfo'],
                p0 = colRow['p0'];
            var p1 = void 0,
                p2 = void 0;
            for (var _i = cols[0]; _i <= cols[1]; _i++) {
                p1 = this._getCellNW(_i, rows[0], gridInfo);
                p2 = this._getCellNW(_i, rows[1], gridInfo);
                this.context.moveTo(p1.x, p1.y);
                this.context.lineTo(p2.x, p2.y);
            }
            for (var _i2 = rows[0]; _i2 <= rows[1]; _i2++) {
                p1 = this._getCellNW(cols[0], _i2, gridInfo);
                p2 = this._getCellNW(cols[1], _i2, gridInfo);
                this.context.moveTo(p1.x, p1.y);
                this.context.lineTo(p2.x, p2.y);
            }
            Canvas._stroke(this.context, this._compiledGridStyle['lineOpacity'], p0.x, p0.y);
        }
    };

    GridCanvasRenderer.prototype._getProjGridToDraw = function _getProjGridToDraw(grid) {
        var map = this.getMap(),

        // projection = map.getProjection(),
        extent = map._get2DExtent(),
            gridX = grid.cols || [-Infinity, Infinity],
            gridY = grid.rows || [-Infinity, Infinity],
            gridCenter = new Coordinate(grid.center),
            center = map.coordinateToPoint(gridCenter),
            size = getCellPointSize(this.layer, grid),
            width = size[0],
            height = size[1];
        if (Util.isNil(gridX[0])) gridX[0] = -Infinity;
        if (Util.isNil(gridX[1])) gridX[1] = Infinity;
        if (Util.isNil(gridY[0])) gridY[0] = -Infinity;
        if (Util.isNil(gridY[1])) gridY[1] = Infinity;
        var gridExtent = new PointExtent(center.x + gridX[0] * width, center.y + gridY[0] * height, center.x + gridX[1] * width, center.y + gridY[1] * height);
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
            width: width,
            height: height,
            center: center,
            unit: grid.unit
        };
    };

    GridCanvasRenderer.prototype._getGridToDraw = function _getGridToDraw(grid, index) {
        var map = this.getMap(),

        // projection = map.getProjection(),
        extent = map.getExtent(),
            gridCenter = new Coordinate(grid.center),
            gridExtent = this.layer.getGridExtent(index),
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
            var dx1 = map.computeLength(new Coordinate(intersection.xmin, gridCenter.y), gridCenter),
                dx2 = map.computeLength(new Coordinate(intersection.xmax, gridCenter.y), gridCenter);
            //经纬度里，ymax在上方，ymin在下方，和projection时是反的
            var dy1 = map.computeLength(new Coordinate(gridCenter.x, intersection.ymax), gridCenter),
                dy2 = map.computeLength(new Coordinate(gridCenter.x, intersection.ymin), gridCenter);
            cols = [-Math.round(dx1 / grid.width), Math.round(dx2 / grid.width)];
            rows = [-Math.round(dy1 / grid.height), Math.round(dy2 / grid.height)];
        } else if (grid['unit'] === 'degree') {
            cols = [-Math.ceil((gridCenter.x - intersection.xmin - delta) / w), Math.ceil((intersection.xmax - gridCenter.x - delta) / w)];
            rows = [-Math.ceil((intersection.ymax - gridCenter.y - delta) / h), Math.ceil((gridCenter.y - intersection.ymin - delta) / h)];
        }

        return {
            cols: cols,
            rows: rows,
            center: gridCenter,
            unit: grid.unit,
            width: grid.width,
            height: grid.height
        };
    };

    GridCanvasRenderer.prototype._getCellNWPoint = function _getCellNWPoint(col, row, gridInfo, targetZ) {
        var map = this.getMap();
        if (gridInfo['unit'] === 'projection') {
            var p = new Point(gridInfo.center.x + col * gridInfo.width, gridInfo.center.y + row * gridInfo.height);
            if (map._pointToPointAtZoom) {
                return map._pointToPointAtZoom(p, targetZ);
            } else {
                return map._pointToPointAtRes(p, map.getResolution(targetZ));
            }
        } else if (gridInfo['unit'] === 'meter') {
            var center = gridInfo.center;
            var target = map.locate(center, gridInfo.width * col, -gridInfo.height * row);
            return map.coordToPoint(target, targetZ);
        } else if (gridInfo['unit'] === 'degree') {
            var _center = gridInfo.center;
            var _target = _center.add(col * gridInfo.width, -row * gridInfo.height);
            return map.coordToPoint(_target, targetZ);
        }
        return null;
    };

    GridCanvasRenderer.prototype._getCellNW = function _getCellNW(col, row, gridInfo) {
        var point = this._getCellNWPoint(col, row, gridInfo);
        return this.getMap()._pointToContainerPoint(point);
    };

    GridCanvasRenderer.prototype._getCellCenter = function _getCellCenter(col, row, gridInfo) {
        var map = this.getMap();
        if (gridInfo['unit'] === 'projection') {
            var p = new Point(gridInfo.center.x + (col + 1 / 2) * gridInfo.width, gridInfo.center.y + (row + 1 / 2) * gridInfo.height);
            return map.pointToCoordinate(p);
        } else if (gridInfo['unit'] === 'meter') {
            var center = gridInfo.center;
            return map.locate(center, gridInfo.width * (col + 1 / 2), -gridInfo.height * (row + 1 / 2));
        } else if (gridInfo['unit'] === 'degree') {
            var _center2 = gridInfo.center;
            return _center2.add(gridInfo.width * (col + 1 / 2), -gridInfo.height * (row + 1 / 2));
        }
        return null;
    };

    GridCanvasRenderer.prototype._drawData = function _drawData() {
        var _this3 = this;

        var count = this.layer.getGridCount();

        var _loop2 = function _loop2(i) {
            var grid = _this3.layer.getGrid(i),
                gridInfo = grid['unit'] === 'projection' ? _this3._getProjGridToDraw(grid, i) : _this3._getGridToDraw(grid, i),
                data = grid['data'];
            if (!Array.isArray(data) || !data.length) {
                return {
                    v: void 0
                };
            }
            data.forEach(function (gridData, index) {
                if (!gridData[2]['symbol'] || !gridInfo) {
                    return;
                }
                _this3._drawDataGrid(gridData, _this3._compiledSymbols[i][index], gridInfo);
                _this3._drawLabel(i, gridData, index, gridInfo);
            });
        };

        for (var i = 0; i < count; i++) {
            var _ret3 = _loop2(i);

            if ((typeof _ret3 === 'undefined' ? 'undefined' : _typeof(_ret3)) === "object") return _ret3.v;
        }
    };

    GridCanvasRenderer.prototype._drawDataGrid = function _drawDataGrid(gridData, symbol, gridInfo) {
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
                gridExtent = new PointExtent(p1.x, p1.y, p3.x, p3.y);
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
            Canvas.fillCanvas(ctx, symbol['polygonOpacity'], p0.x, p0.y);
            Canvas._stroke(ctx, symbol['lineOpacity']);
        }
    };

    GridCanvasRenderer.prototype._testSymbol = function _testSymbol(symbol) {
        for (var i = symbolizers.length - 1; i >= 0; i--) {
            if (symbolizers[i].test(symbol)) {
                return true;
            }
        }
        return false;
    };

    GridCanvasRenderer.prototype._drawLabel = function _drawLabel(gridIndex, gridData, index, gridInfo) {
        if (!this._gridSymbolTests) {
            this._gridSymbolTests = {};
        }
        if (!this._gridSymbolTests[gridIndex]) {
            this._gridSymbolTests[gridIndex] = [];
        }
        if (Util.isNil(this._gridSymbolTests[gridIndex][index])) {
            this._gridSymbolTests[gridIndex][index] = this._testSymbol(gridData[2]['symbol']);
        }
        if (!this._gridSymbolTests[gridIndex][index]) {
            return;
        }
        var symbol = gridData[2]['symbol'];
        var map = this.getMap(),
            extent = map.getExtent();
        if (!this._dataMarkers) {
            this._dataMarkers = {};
        }
        var dataMarkers = this._dataMarkers[gridIndex];
        if (!dataMarkers) {
            this._dataMarkers[gridIndex] = dataMarkers = [];
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
            var lineSymbol = Util.extend({}, symbol);
            lineSymbol['markerPlacement'] = 'point';
            lineSymbol['textPlacement'] = 'point';
            lineSymbol['lineOpacity'] = 0;
            lineSymbol['polygonOpacity'] = 0;
            line = new LineString(coordinates, {
                'symbol': lineSymbol,
                'properties': gridData[2]['properties'],
                'debug': this.layer.options['debug']
            });
            line._bindLayer(this.layer);
            dataMarkers[index] = line;
        } else {
            var redraw = this._toRedraw;
            line.setCoordinates(coordinates);
            this._toRedraw = redraw;
        }
        line._getPainter().paint();
    };

    GridCanvasRenderer.prototype._setCanvasStyle = function _setCanvasStyle(symbol) {
        var s = Util.extend({}, defaultSymbol, symbol);
        Canvas.prepareCanvas(this.context, s, this._resources);
    };

    GridCanvasRenderer.prototype.onRemove = function onRemove() {
        delete this._compiledGridStyle;
        delete this._compiledSymbols;
        delete this._gridSymbolTests;
        delete this._dataMarkers;
    };

    return GridCanvasRenderer;
}(renderer.CanvasRenderer);

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var clone_1 = createCommonjsModule(function (module) {
  var clone = function () {
    'use strict';

    /**
     * Clones (copies) an Object using deep copying.
     *
     * This function supports circular references by default, but if you are certain
     * there are no circular references in your object, you can save some CPU time
     * by calling clone(obj, false).
     *
     * Caution: if `circular` is false and `parent` contains circular references,
     * your program may enter an infinite loop and crash.
     *
     * @param `parent` - the object to be cloned
     * @param `circular` - set to true if the object to be cloned may contain
     *    circular references. (optional - true by default)
     * @param `depth` - set to a number if the object is only to be cloned to
     *    a particular depth. (optional - defaults to Infinity)
     * @param `prototype` - sets the prototype to be used when cloning an object.
     *    (optional - defaults to parent prototype).
    */

    function clone(parent, circular, depth, prototype) {
      var filter;
      if ((typeof circular === 'undefined' ? 'undefined' : _typeof(circular)) === 'object') {
        depth = circular.depth;
        prototype = circular.prototype;
        filter = circular.filter;
        circular = circular.circular;
      }
      // maintain two arrays for circular references, where corresponding parents
      // and children have the same index
      var allParents = [];
      var allChildren = [];

      var useBuffer = typeof Buffer != 'undefined';

      if (typeof circular == 'undefined') circular = true;

      if (typeof depth == 'undefined') depth = Infinity;

      // recurse this function so we don't reset allParents and allChildren
      function _clone(parent, depth) {
        // cloning null always returns null
        if (parent === null) return null;

        if (depth == 0) return parent;

        var child;
        var proto;
        if ((typeof parent === 'undefined' ? 'undefined' : _typeof(parent)) != 'object') {
          return parent;
        }

        if (clone.__isArray(parent)) {
          child = [];
        } else if (clone.__isRegExp(parent)) {
          child = new RegExp(parent.source, __getRegExpFlags(parent));
          if (parent.lastIndex) child.lastIndex = parent.lastIndex;
        } else if (clone.__isDate(parent)) {
          child = new Date(parent.getTime());
        } else if (useBuffer && Buffer.isBuffer(parent)) {
          child = new Buffer(parent.length);
          parent.copy(child);
          return child;
        } else {
          if (typeof prototype == 'undefined') {
            proto = Object.getPrototypeOf(parent);
            child = Object.create(proto);
          } else {
            child = Object.create(prototype);
            proto = prototype;
          }
        }

        if (circular) {
          var index = allParents.indexOf(parent);

          if (index != -1) {
            return allChildren[index];
          }
          allParents.push(parent);
          allChildren.push(child);
        }

        for (var i in parent) {
          var attrs;
          if (proto) {
            attrs = Object.getOwnPropertyDescriptor(proto, i);
          }

          if (attrs && attrs.set == null) {
            continue;
          }
          child[i] = _clone(parent[i], depth - 1);
        }

        return child;
      }

      return _clone(parent, depth);
    }

    /**
     * Simple flat clone using prototype, accepts only objects, usefull for property
     * override on FLAT configuration object (no nested props).
     *
     * USE WITH CAUTION! This may not behave as you wish if you do not know how this
     * works.
     */
    clone.clonePrototype = function clonePrototype(parent) {
      if (parent === null) return null;

      var c = function c() {};
      c.prototype = parent;
      return new c();
    };

    // private utility functions

    function __objToStr(o) {
      return Object.prototype.toString.call(o);
    }
    clone.__objToStr = __objToStr;

    function __isDate(o) {
      return (typeof o === 'undefined' ? 'undefined' : _typeof(o)) === 'object' && __objToStr(o) === '[object Date]';
    }
    clone.__isDate = __isDate;

    function __isArray(o) {
      return (typeof o === 'undefined' ? 'undefined' : _typeof(o)) === 'object' && __objToStr(o) === '[object Array]';
    }
    clone.__isArray = __isArray;

    function __isRegExp(o) {
      return (typeof o === 'undefined' ? 'undefined' : _typeof(o)) === 'object' && __objToStr(o) === '[object RegExp]';
    }
    clone.__isRegExp = __isRegExp;

    function __getRegExpFlags(re) {
      var flags = '';
      if (re.global) flags += 'g';
      if (re.ignoreCase) flags += 'i';
      if (re.multiline) flags += 'm';
      return flags;
    }
    clone.__getRegExpFlags = __getRegExpFlags;

    return clone;
  }();

  if ('object' === 'object' && module.exports) {
    module.exports = clone;
  }
});

var colorName = {
	"aliceblue": [240, 248, 255],
	"antiquewhite": [250, 235, 215],
	"aqua": [0, 255, 255],
	"aquamarine": [127, 255, 212],
	"azure": [240, 255, 255],
	"beige": [245, 245, 220],
	"bisque": [255, 228, 196],
	"black": [0, 0, 0],
	"blanchedalmond": [255, 235, 205],
	"blue": [0, 0, 255],
	"blueviolet": [138, 43, 226],
	"brown": [165, 42, 42],
	"burlywood": [222, 184, 135],
	"cadetblue": [95, 158, 160],
	"chartreuse": [127, 255, 0],
	"chocolate": [210, 105, 30],
	"coral": [255, 127, 80],
	"cornflowerblue": [100, 149, 237],
	"cornsilk": [255, 248, 220],
	"crimson": [220, 20, 60],
	"cyan": [0, 255, 255],
	"darkblue": [0, 0, 139],
	"darkcyan": [0, 139, 139],
	"darkgoldenrod": [184, 134, 11],
	"darkgray": [169, 169, 169],
	"darkgreen": [0, 100, 0],
	"darkgrey": [169, 169, 169],
	"darkkhaki": [189, 183, 107],
	"darkmagenta": [139, 0, 139],
	"darkolivegreen": [85, 107, 47],
	"darkorange": [255, 140, 0],
	"darkorchid": [153, 50, 204],
	"darkred": [139, 0, 0],
	"darksalmon": [233, 150, 122],
	"darkseagreen": [143, 188, 143],
	"darkslateblue": [72, 61, 139],
	"darkslategray": [47, 79, 79],
	"darkslategrey": [47, 79, 79],
	"darkturquoise": [0, 206, 209],
	"darkviolet": [148, 0, 211],
	"deeppink": [255, 20, 147],
	"deepskyblue": [0, 191, 255],
	"dimgray": [105, 105, 105],
	"dimgrey": [105, 105, 105],
	"dodgerblue": [30, 144, 255],
	"firebrick": [178, 34, 34],
	"floralwhite": [255, 250, 240],
	"forestgreen": [34, 139, 34],
	"fuchsia": [255, 0, 255],
	"gainsboro": [220, 220, 220],
	"ghostwhite": [248, 248, 255],
	"gold": [255, 215, 0],
	"goldenrod": [218, 165, 32],
	"gray": [128, 128, 128],
	"green": [0, 128, 0],
	"greenyellow": [173, 255, 47],
	"grey": [128, 128, 128],
	"honeydew": [240, 255, 240],
	"hotpink": [255, 105, 180],
	"indianred": [205, 92, 92],
	"indigo": [75, 0, 130],
	"ivory": [255, 255, 240],
	"khaki": [240, 230, 140],
	"lavender": [230, 230, 250],
	"lavenderblush": [255, 240, 245],
	"lawngreen": [124, 252, 0],
	"lemonchiffon": [255, 250, 205],
	"lightblue": [173, 216, 230],
	"lightcoral": [240, 128, 128],
	"lightcyan": [224, 255, 255],
	"lightgoldenrodyellow": [250, 250, 210],
	"lightgray": [211, 211, 211],
	"lightgreen": [144, 238, 144],
	"lightgrey": [211, 211, 211],
	"lightpink": [255, 182, 193],
	"lightsalmon": [255, 160, 122],
	"lightseagreen": [32, 178, 170],
	"lightskyblue": [135, 206, 250],
	"lightslategray": [119, 136, 153],
	"lightslategrey": [119, 136, 153],
	"lightsteelblue": [176, 196, 222],
	"lightyellow": [255, 255, 224],
	"lime": [0, 255, 0],
	"limegreen": [50, 205, 50],
	"linen": [250, 240, 230],
	"magenta": [255, 0, 255],
	"maroon": [128, 0, 0],
	"mediumaquamarine": [102, 205, 170],
	"mediumblue": [0, 0, 205],
	"mediumorchid": [186, 85, 211],
	"mediumpurple": [147, 112, 219],
	"mediumseagreen": [60, 179, 113],
	"mediumslateblue": [123, 104, 238],
	"mediumspringgreen": [0, 250, 154],
	"mediumturquoise": [72, 209, 204],
	"mediumvioletred": [199, 21, 133],
	"midnightblue": [25, 25, 112],
	"mintcream": [245, 255, 250],
	"mistyrose": [255, 228, 225],
	"moccasin": [255, 228, 181],
	"navajowhite": [255, 222, 173],
	"navy": [0, 0, 128],
	"oldlace": [253, 245, 230],
	"olive": [128, 128, 0],
	"olivedrab": [107, 142, 35],
	"orange": [255, 165, 0],
	"orangered": [255, 69, 0],
	"orchid": [218, 112, 214],
	"palegoldenrod": [238, 232, 170],
	"palegreen": [152, 251, 152],
	"paleturquoise": [175, 238, 238],
	"palevioletred": [219, 112, 147],
	"papayawhip": [255, 239, 213],
	"peachpuff": [255, 218, 185],
	"peru": [205, 133, 63],
	"pink": [255, 192, 203],
	"plum": [221, 160, 221],
	"powderblue": [176, 224, 230],
	"purple": [128, 0, 128],
	"rebeccapurple": [102, 51, 153],
	"red": [255, 0, 0],
	"rosybrown": [188, 143, 143],
	"royalblue": [65, 105, 225],
	"saddlebrown": [139, 69, 19],
	"salmon": [250, 128, 114],
	"sandybrown": [244, 164, 96],
	"seagreen": [46, 139, 87],
	"seashell": [255, 245, 238],
	"sienna": [160, 82, 45],
	"silver": [192, 192, 192],
	"skyblue": [135, 206, 235],
	"slateblue": [106, 90, 205],
	"slategray": [112, 128, 144],
	"slategrey": [112, 128, 144],
	"snow": [255, 250, 250],
	"springgreen": [0, 255, 127],
	"steelblue": [70, 130, 180],
	"tan": [210, 180, 140],
	"teal": [0, 128, 128],
	"thistle": [216, 191, 216],
	"tomato": [255, 99, 71],
	"turquoise": [64, 224, 208],
	"violet": [238, 130, 238],
	"wheat": [245, 222, 179],
	"white": [255, 255, 255],
	"whitesmoke": [245, 245, 245],
	"yellow": [255, 255, 0],
	"yellowgreen": [154, 205, 50]
};

var conversions = createCommonjsModule(function (module) {
	/* MIT license */

	// NOTE: conversions should only return primitive values (i.e. arrays, or
	//       values that give correct `typeof` results).
	//       do not use box values types (i.e. Number(), String(), etc.)

	var reverseKeywords = {};
	for (var key in colorName) {
		if (colorName.hasOwnProperty(key)) {
			reverseKeywords[colorName[key]] = key;
		}
	}

	var convert = module.exports = {
		rgb: { channels: 3, labels: 'rgb' },
		hsl: { channels: 3, labels: 'hsl' },
		hsv: { channels: 3, labels: 'hsv' },
		hwb: { channels: 3, labels: 'hwb' },
		cmyk: { channels: 4, labels: 'cmyk' },
		xyz: { channels: 3, labels: 'xyz' },
		lab: { channels: 3, labels: 'lab' },
		lch: { channels: 3, labels: 'lch' },
		hex: { channels: 1, labels: ['hex'] },
		keyword: { channels: 1, labels: ['keyword'] },
		ansi16: { channels: 1, labels: ['ansi16'] },
		ansi256: { channels: 1, labels: ['ansi256'] },
		hcg: { channels: 3, labels: ['h', 'c', 'g'] },
		apple: { channels: 3, labels: ['r16', 'g16', 'b16'] },
		gray: { channels: 1, labels: ['gray'] }
	};

	// hide .channels and .labels properties
	for (var model in convert) {
		if (convert.hasOwnProperty(model)) {
			if (!('channels' in convert[model])) {
				throw new Error('missing channels property: ' + model);
			}

			if (!('labels' in convert[model])) {
				throw new Error('missing channel labels property: ' + model);
			}

			if (convert[model].labels.length !== convert[model].channels) {
				throw new Error('channel and label counts mismatch: ' + model);
			}

			var channels = convert[model].channels;
			var labels = convert[model].labels;
			delete convert[model].channels;
			delete convert[model].labels;
			Object.defineProperty(convert[model], 'channels', { value: channels });
			Object.defineProperty(convert[model], 'labels', { value: labels });
		}
	}

	convert.rgb.hsl = function (rgb) {
		var r = rgb[0] / 255;
		var g = rgb[1] / 255;
		var b = rgb[2] / 255;
		var min = Math.min(r, g, b);
		var max = Math.max(r, g, b);
		var delta = max - min;
		var h;
		var s;
		var l;

		if (max === min) {
			h = 0;
		} else if (r === max) {
			h = (g - b) / delta;
		} else if (g === max) {
			h = 2 + (b - r) / delta;
		} else if (b === max) {
			h = 4 + (r - g) / delta;
		}

		h = Math.min(h * 60, 360);

		if (h < 0) {
			h += 360;
		}

		l = (min + max) / 2;

		if (max === min) {
			s = 0;
		} else if (l <= 0.5) {
			s = delta / (max + min);
		} else {
			s = delta / (2 - max - min);
		}

		return [h, s * 100, l * 100];
	};

	convert.rgb.hsv = function (rgb) {
		var r = rgb[0];
		var g = rgb[1];
		var b = rgb[2];
		var min = Math.min(r, g, b);
		var max = Math.max(r, g, b);
		var delta = max - min;
		var h;
		var s;
		var v;

		if (max === 0) {
			s = 0;
		} else {
			s = delta / max * 1000 / 10;
		}

		if (max === min) {
			h = 0;
		} else if (r === max) {
			h = (g - b) / delta;
		} else if (g === max) {
			h = 2 + (b - r) / delta;
		} else if (b === max) {
			h = 4 + (r - g) / delta;
		}

		h = Math.min(h * 60, 360);

		if (h < 0) {
			h += 360;
		}

		v = max / 255 * 1000 / 10;

		return [h, s, v];
	};

	convert.rgb.hwb = function (rgb) {
		var r = rgb[0];
		var g = rgb[1];
		var b = rgb[2];
		var h = convert.rgb.hsl(rgb)[0];
		var w = 1 / 255 * Math.min(r, Math.min(g, b));

		b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));

		return [h, w * 100, b * 100];
	};

	convert.rgb.cmyk = function (rgb) {
		var r = rgb[0] / 255;
		var g = rgb[1] / 255;
		var b = rgb[2] / 255;
		var c;
		var m;
		var y;
		var k;

		k = Math.min(1 - r, 1 - g, 1 - b);
		c = (1 - r - k) / (1 - k) || 0;
		m = (1 - g - k) / (1 - k) || 0;
		y = (1 - b - k) / (1 - k) || 0;

		return [c * 100, m * 100, y * 100, k * 100];
	};

	/**
  * See https://en.m.wikipedia.org/wiki/Euclidean_distance#Squared_Euclidean_distance
  * */
	function comparativeDistance(x, y) {
		return Math.pow(x[0] - y[0], 2) + Math.pow(x[1] - y[1], 2) + Math.pow(x[2] - y[2], 2);
	}

	convert.rgb.keyword = function (rgb) {
		var reversed = reverseKeywords[rgb];
		if (reversed) {
			return reversed;
		}

		var currentClosestDistance = Infinity;
		var currentClosestKeyword;

		for (var keyword in colorName) {
			if (colorName.hasOwnProperty(keyword)) {
				var value = colorName[keyword];

				// Compute comparative distance
				var distance = comparativeDistance(rgb, value);

				// Check if its less, if so set as closest
				if (distance < currentClosestDistance) {
					currentClosestDistance = distance;
					currentClosestKeyword = keyword;
				}
			}
		}

		return currentClosestKeyword;
	};

	convert.keyword.rgb = function (keyword) {
		return colorName[keyword];
	};

	convert.rgb.xyz = function (rgb) {
		var r = rgb[0] / 255;
		var g = rgb[1] / 255;
		var b = rgb[2] / 255;

		// assume sRGB
		r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
		g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
		b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

		var x = r * 0.4124 + g * 0.3576 + b * 0.1805;
		var y = r * 0.2126 + g * 0.7152 + b * 0.0722;
		var z = r * 0.0193 + g * 0.1192 + b * 0.9505;

		return [x * 100, y * 100, z * 100];
	};

	convert.rgb.lab = function (rgb) {
		var xyz = convert.rgb.xyz(rgb);
		var x = xyz[0];
		var y = xyz[1];
		var z = xyz[2];
		var l;
		var a;
		var b;

		x /= 95.047;
		y /= 100;
		z /= 108.883;

		x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
		y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
		z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

		l = 116 * y - 16;
		a = 500 * (x - y);
		b = 200 * (y - z);

		return [l, a, b];
	};

	convert.hsl.rgb = function (hsl) {
		var h = hsl[0] / 360;
		var s = hsl[1] / 100;
		var l = hsl[2] / 100;
		var t1;
		var t2;
		var t3;
		var rgb;
		var val;

		if (s === 0) {
			val = l * 255;
			return [val, val, val];
		}

		if (l < 0.5) {
			t2 = l * (1 + s);
		} else {
			t2 = l + s - l * s;
		}

		t1 = 2 * l - t2;

		rgb = [0, 0, 0];
		for (var i = 0; i < 3; i++) {
			t3 = h + 1 / 3 * -(i - 1);
			if (t3 < 0) {
				t3++;
			}
			if (t3 > 1) {
				t3--;
			}

			if (6 * t3 < 1) {
				val = t1 + (t2 - t1) * 6 * t3;
			} else if (2 * t3 < 1) {
				val = t2;
			} else if (3 * t3 < 2) {
				val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
			} else {
				val = t1;
			}

			rgb[i] = val * 255;
		}

		return rgb;
	};

	convert.hsl.hsv = function (hsl) {
		var h = hsl[0];
		var s = hsl[1] / 100;
		var l = hsl[2] / 100;
		var smin = s;
		var lmin = Math.max(l, 0.01);
		var sv;
		var v;

		l *= 2;
		s *= l <= 1 ? l : 2 - l;
		smin *= lmin <= 1 ? lmin : 2 - lmin;
		v = (l + s) / 2;
		sv = l === 0 ? 2 * smin / (lmin + smin) : 2 * s / (l + s);

		return [h, sv * 100, v * 100];
	};

	convert.hsv.rgb = function (hsv) {
		var h = hsv[0] / 60;
		var s = hsv[1] / 100;
		var v = hsv[2] / 100;
		var hi = Math.floor(h) % 6;

		var f = h - Math.floor(h);
		var p = 255 * v * (1 - s);
		var q = 255 * v * (1 - s * f);
		var t = 255 * v * (1 - s * (1 - f));
		v *= 255;

		switch (hi) {
			case 0:
				return [v, t, p];
			case 1:
				return [q, v, p];
			case 2:
				return [p, v, t];
			case 3:
				return [p, q, v];
			case 4:
				return [t, p, v];
			case 5:
				return [v, p, q];
		}
	};

	convert.hsv.hsl = function (hsv) {
		var h = hsv[0];
		var s = hsv[1] / 100;
		var v = hsv[2] / 100;
		var vmin = Math.max(v, 0.01);
		var lmin;
		var sl;
		var l;

		l = (2 - s) * v;
		lmin = (2 - s) * vmin;
		sl = s * vmin;
		sl /= lmin <= 1 ? lmin : 2 - lmin;
		sl = sl || 0;
		l /= 2;

		return [h, sl * 100, l * 100];
	};

	// http://dev.w3.org/csswg/css-color/#hwb-to-rgb
	convert.hwb.rgb = function (hwb) {
		var h = hwb[0] / 360;
		var wh = hwb[1] / 100;
		var bl = hwb[2] / 100;
		var ratio = wh + bl;
		var i;
		var v;
		var f;
		var n;

		// wh + bl cant be > 1
		if (ratio > 1) {
			wh /= ratio;
			bl /= ratio;
		}

		i = Math.floor(6 * h);
		v = 1 - bl;
		f = 6 * h - i;

		if ((i & 0x01) !== 0) {
			f = 1 - f;
		}

		n = wh + f * (v - wh); // linear interpolation

		var r;
		var g;
		var b;
		switch (i) {
			default:
			case 6:
			case 0:
				r = v;g = n;b = wh;break;
			case 1:
				r = n;g = v;b = wh;break;
			case 2:
				r = wh;g = v;b = n;break;
			case 3:
				r = wh;g = n;b = v;break;
			case 4:
				r = n;g = wh;b = v;break;
			case 5:
				r = v;g = wh;b = n;break;
		}

		return [r * 255, g * 255, b * 255];
	};

	convert.cmyk.rgb = function (cmyk) {
		var c = cmyk[0] / 100;
		var m = cmyk[1] / 100;
		var y = cmyk[2] / 100;
		var k = cmyk[3] / 100;
		var r;
		var g;
		var b;

		r = 1 - Math.min(1, c * (1 - k) + k);
		g = 1 - Math.min(1, m * (1 - k) + k);
		b = 1 - Math.min(1, y * (1 - k) + k);

		return [r * 255, g * 255, b * 255];
	};

	convert.xyz.rgb = function (xyz) {
		var x = xyz[0] / 100;
		var y = xyz[1] / 100;
		var z = xyz[2] / 100;
		var r;
		var g;
		var b;

		r = x * 3.2406 + y * -1.5372 + z * -0.4986;
		g = x * -0.9689 + y * 1.8758 + z * 0.0415;
		b = x * 0.0557 + y * -0.2040 + z * 1.0570;

		// assume sRGB
		r = r > 0.0031308 ? 1.055 * Math.pow(r, 1.0 / 2.4) - 0.055 : r * 12.92;

		g = g > 0.0031308 ? 1.055 * Math.pow(g, 1.0 / 2.4) - 0.055 : g * 12.92;

		b = b > 0.0031308 ? 1.055 * Math.pow(b, 1.0 / 2.4) - 0.055 : b * 12.92;

		r = Math.min(Math.max(0, r), 1);
		g = Math.min(Math.max(0, g), 1);
		b = Math.min(Math.max(0, b), 1);

		return [r * 255, g * 255, b * 255];
	};

	convert.xyz.lab = function (xyz) {
		var x = xyz[0];
		var y = xyz[1];
		var z = xyz[2];
		var l;
		var a;
		var b;

		x /= 95.047;
		y /= 100;
		z /= 108.883;

		x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
		y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
		z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

		l = 116 * y - 16;
		a = 500 * (x - y);
		b = 200 * (y - z);

		return [l, a, b];
	};

	convert.lab.xyz = function (lab) {
		var l = lab[0];
		var a = lab[1];
		var b = lab[2];
		var x;
		var y;
		var z;

		y = (l + 16) / 116;
		x = a / 500 + y;
		z = y - b / 200;

		var y2 = Math.pow(y, 3);
		var x2 = Math.pow(x, 3);
		var z2 = Math.pow(z, 3);
		y = y2 > 0.008856 ? y2 : (y - 16 / 116) / 7.787;
		x = x2 > 0.008856 ? x2 : (x - 16 / 116) / 7.787;
		z = z2 > 0.008856 ? z2 : (z - 16 / 116) / 7.787;

		x *= 95.047;
		y *= 100;
		z *= 108.883;

		return [x, y, z];
	};

	convert.lab.lch = function (lab) {
		var l = lab[0];
		var a = lab[1];
		var b = lab[2];
		var hr;
		var h;
		var c;

		hr = Math.atan2(b, a);
		h = hr * 360 / 2 / Math.PI;

		if (h < 0) {
			h += 360;
		}

		c = Math.sqrt(a * a + b * b);

		return [l, c, h];
	};

	convert.lch.lab = function (lch) {
		var l = lch[0];
		var c = lch[1];
		var h = lch[2];
		var a;
		var b;
		var hr;

		hr = h / 360 * 2 * Math.PI;
		a = c * Math.cos(hr);
		b = c * Math.sin(hr);

		return [l, a, b];
	};

	convert.rgb.ansi16 = function (args) {
		var r = args[0];
		var g = args[1];
		var b = args[2];
		var value = 1 in arguments ? arguments[1] : convert.rgb.hsv(args)[2]; // hsv -> ansi16 optimization

		value = Math.round(value / 50);

		if (value === 0) {
			return 30;
		}

		var ansi = 30 + (Math.round(b / 255) << 2 | Math.round(g / 255) << 1 | Math.round(r / 255));

		if (value === 2) {
			ansi += 60;
		}

		return ansi;
	};

	convert.hsv.ansi16 = function (args) {
		// optimization here; we already know the value and don't need to get
		// it converted for us.
		return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
	};

	convert.rgb.ansi256 = function (args) {
		var r = args[0];
		var g = args[1];
		var b = args[2];

		// we use the extended greyscale palette here, with the exception of
		// black and white. normal palette only has 4 greyscale shades.
		if (r === g && g === b) {
			if (r < 8) {
				return 16;
			}

			if (r > 248) {
				return 231;
			}

			return Math.round((r - 8) / 247 * 24) + 232;
		}

		var ansi = 16 + 36 * Math.round(r / 255 * 5) + 6 * Math.round(g / 255 * 5) + Math.round(b / 255 * 5);

		return ansi;
	};

	convert.ansi16.rgb = function (args) {
		var color = args % 10;

		// handle greyscale
		if (color === 0 || color === 7) {
			if (args > 50) {
				color += 3.5;
			}

			color = color / 10.5 * 255;

			return [color, color, color];
		}

		var mult = (~~(args > 50) + 1) * 0.5;
		var r = (color & 1) * mult * 255;
		var g = (color >> 1 & 1) * mult * 255;
		var b = (color >> 2 & 1) * mult * 255;

		return [r, g, b];
	};

	convert.ansi256.rgb = function (args) {
		// handle greyscale
		if (args >= 232) {
			var c = (args - 232) * 10 + 8;
			return [c, c, c];
		}

		args -= 16;

		var rem;
		var r = Math.floor(args / 36) / 5 * 255;
		var g = Math.floor((rem = args % 36) / 6) / 5 * 255;
		var b = rem % 6 / 5 * 255;

		return [r, g, b];
	};

	convert.rgb.hex = function (args) {
		var integer = ((Math.round(args[0]) & 0xFF) << 16) + ((Math.round(args[1]) & 0xFF) << 8) + (Math.round(args[2]) & 0xFF);

		var string = integer.toString(16).toUpperCase();
		return '000000'.substring(string.length) + string;
	};

	convert.hex.rgb = function (args) {
		var match = args.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);
		if (!match) {
			return [0, 0, 0];
		}

		var colorString = match[0];

		if (match[0].length === 3) {
			colorString = colorString.split('').map(function (char) {
				return char + char;
			}).join('');
		}

		var integer = parseInt(colorString, 16);
		var r = integer >> 16 & 0xFF;
		var g = integer >> 8 & 0xFF;
		var b = integer & 0xFF;

		return [r, g, b];
	};

	convert.rgb.hcg = function (rgb) {
		var r = rgb[0] / 255;
		var g = rgb[1] / 255;
		var b = rgb[2] / 255;
		var max = Math.max(Math.max(r, g), b);
		var min = Math.min(Math.min(r, g), b);
		var chroma = max - min;
		var grayscale;
		var hue;

		if (chroma < 1) {
			grayscale = min / (1 - chroma);
		} else {
			grayscale = 0;
		}

		if (chroma <= 0) {
			hue = 0;
		} else if (max === r) {
			hue = (g - b) / chroma % 6;
		} else if (max === g) {
			hue = 2 + (b - r) / chroma;
		} else {
			hue = 4 + (r - g) / chroma + 4;
		}

		hue /= 6;
		hue %= 1;

		return [hue * 360, chroma * 100, grayscale * 100];
	};

	convert.hsl.hcg = function (hsl) {
		var s = hsl[1] / 100;
		var l = hsl[2] / 100;
		var c = 1;
		var f = 0;

		if (l < 0.5) {
			c = 2.0 * s * l;
		} else {
			c = 2.0 * s * (1.0 - l);
		}

		if (c < 1.0) {
			f = (l - 0.5 * c) / (1.0 - c);
		}

		return [hsl[0], c * 100, f * 100];
	};

	convert.hsv.hcg = function (hsv) {
		var s = hsv[1] / 100;
		var v = hsv[2] / 100;

		var c = s * v;
		var f = 0;

		if (c < 1.0) {
			f = (v - c) / (1 - c);
		}

		return [hsv[0], c * 100, f * 100];
	};

	convert.hcg.rgb = function (hcg) {
		var h = hcg[0] / 360;
		var c = hcg[1] / 100;
		var g = hcg[2] / 100;

		if (c === 0.0) {
			return [g * 255, g * 255, g * 255];
		}

		var pure = [0, 0, 0];
		var hi = h % 1 * 6;
		var v = hi % 1;
		var w = 1 - v;
		var mg = 0;

		switch (Math.floor(hi)) {
			case 0:
				pure[0] = 1;pure[1] = v;pure[2] = 0;break;
			case 1:
				pure[0] = w;pure[1] = 1;pure[2] = 0;break;
			case 2:
				pure[0] = 0;pure[1] = 1;pure[2] = v;break;
			case 3:
				pure[0] = 0;pure[1] = w;pure[2] = 1;break;
			case 4:
				pure[0] = v;pure[1] = 0;pure[2] = 1;break;
			default:
				pure[0] = 1;pure[1] = 0;pure[2] = w;
		}

		mg = (1.0 - c) * g;

		return [(c * pure[0] + mg) * 255, (c * pure[1] + mg) * 255, (c * pure[2] + mg) * 255];
	};

	convert.hcg.hsv = function (hcg) {
		var c = hcg[1] / 100;
		var g = hcg[2] / 100;

		var v = c + g * (1.0 - c);
		var f = 0;

		if (v > 0.0) {
			f = c / v;
		}

		return [hcg[0], f * 100, v * 100];
	};

	convert.hcg.hsl = function (hcg) {
		var c = hcg[1] / 100;
		var g = hcg[2] / 100;

		var l = g * (1.0 - c) + 0.5 * c;
		var s = 0;

		if (l > 0.0 && l < 0.5) {
			s = c / (2 * l);
		} else if (l >= 0.5 && l < 1.0) {
			s = c / (2 * (1 - l));
		}

		return [hcg[0], s * 100, l * 100];
	};

	convert.hcg.hwb = function (hcg) {
		var c = hcg[1] / 100;
		var g = hcg[2] / 100;
		var v = c + g * (1.0 - c);
		return [hcg[0], (v - c) * 100, (1 - v) * 100];
	};

	convert.hwb.hcg = function (hwb) {
		var w = hwb[1] / 100;
		var b = hwb[2] / 100;
		var v = 1 - b;
		var c = v - w;
		var g = 0;

		if (c < 1) {
			g = (v - c) / (1 - c);
		}

		return [hwb[0], c * 100, g * 100];
	};

	convert.apple.rgb = function (apple) {
		return [apple[0] / 65535 * 255, apple[1] / 65535 * 255, apple[2] / 65535 * 255];
	};

	convert.rgb.apple = function (rgb) {
		return [rgb[0] / 255 * 65535, rgb[1] / 255 * 65535, rgb[2] / 255 * 65535];
	};

	convert.gray.rgb = function (args) {
		return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
	};

	convert.gray.hsl = convert.gray.hsv = function (args) {
		return [0, 0, args[0]];
	};

	convert.gray.hwb = function (gray) {
		return [0, 100, gray[0]];
	};

	convert.gray.cmyk = function (gray) {
		return [0, 0, 0, gray[0]];
	};

	convert.gray.lab = function (gray) {
		return [gray[0], 0, 0];
	};

	convert.gray.hex = function (gray) {
		var val = Math.round(gray[0] / 100 * 255) & 0xFF;
		var integer = (val << 16) + (val << 8) + val;

		var string = integer.toString(16).toUpperCase();
		return '000000'.substring(string.length) + string;
	};

	convert.rgb.gray = function (rgb) {
		var val = (rgb[0] + rgb[1] + rgb[2]) / 3;
		return [val / 255 * 100];
	};
});

/*
	this function routes a model to all other models.

	all functions that are routed have a property `.conversion` attached
	to the returned synthetic function. This property is an array
	of strings, each with the steps in between the 'from' and 'to'
	color models (inclusive).

	conversions that are not possible simply are not included.
*/

// https://jsperf.com/object-keys-vs-for-in-with-closure/3
var models$1 = Object.keys(conversions);

function buildGraph() {
	var graph = {};

	for (var len = models$1.length, i = 0; i < len; i++) {
		graph[models$1[i]] = {
			// http://jsperf.com/1-vs-infinity
			// micro-opt, but this is simple.
			distance: -1,
			parent: null
		};
	}

	return graph;
}

// https://en.wikipedia.org/wiki/Breadth-first_search
function deriveBFS(fromModel) {
	var graph = buildGraph();
	var queue = [fromModel]; // unshift -> queue -> pop

	graph[fromModel].distance = 0;

	while (queue.length) {
		var current = queue.pop();
		var adjacents = Object.keys(conversions[current]);

		for (var len = adjacents.length, i = 0; i < len; i++) {
			var adjacent = adjacents[i];
			var node = graph[adjacent];

			if (node.distance === -1) {
				node.distance = graph[current].distance + 1;
				node.parent = current;
				queue.unshift(adjacent);
			}
		}
	}

	return graph;
}

function link(from, to) {
	return function (args) {
		return to(from(args));
	};
}

function wrapConversion(toModel, graph) {
	var path = [graph[toModel].parent, toModel];
	var fn = conversions[graph[toModel].parent][toModel];

	var cur = graph[toModel].parent;
	while (graph[cur].parent) {
		path.unshift(graph[cur].parent);
		fn = link(conversions[graph[cur].parent][cur], fn);
		cur = graph[cur].parent;
	}

	fn.conversion = path;
	return fn;
}

var route = function route(fromModel) {
	var graph = deriveBFS(fromModel);
	var conversion = {};

	var models = Object.keys(graph);
	for (var len = models.length, i = 0; i < len; i++) {
		var toModel = models[i];
		var node = graph[toModel];

		if (node.parent === null) {
			// no possible conversion, or this node is the source model.
			continue;
		}

		conversion[toModel] = wrapConversion(toModel, graph);
	}

	return conversion;
};

var convert = {};

var models = Object.keys(conversions);

function wrapRaw(fn) {
	var wrappedFn = function wrappedFn(args) {
		if (args === undefined || args === null) {
			return args;
		}

		if (arguments.length > 1) {
			args = Array.prototype.slice.call(arguments);
		}

		return fn(args);
	};

	// preserve .conversion property if there is one
	if ('conversion' in fn) {
		wrappedFn.conversion = fn.conversion;
	}

	return wrappedFn;
}

function wrapRounded(fn) {
	var wrappedFn = function wrappedFn(args) {
		if (args === undefined || args === null) {
			return args;
		}

		if (arguments.length > 1) {
			args = Array.prototype.slice.call(arguments);
		}

		var result = fn(args);

		// we're assuming the result is an array here.
		// see notice in conversions.js; don't use box types
		// in conversion functions.
		if ((typeof result === 'undefined' ? 'undefined' : _typeof(result)) === 'object') {
			for (var len = result.length, i = 0; i < len; i++) {
				result[i] = Math.round(result[i]);
			}
		}

		return result;
	};

	// preserve .conversion property if there is one
	if ('conversion' in fn) {
		wrappedFn.conversion = fn.conversion;
	}

	return wrappedFn;
}

models.forEach(function (fromModel) {
	convert[fromModel] = {};

	Object.defineProperty(convert[fromModel], 'channels', { value: conversions[fromModel].channels });
	Object.defineProperty(convert[fromModel], 'labels', { value: conversions[fromModel].labels });

	var routes = route(fromModel);
	var routeModels = Object.keys(routes);

	routeModels.forEach(function (toModel) {
		var fn = routes[toModel];

		convert[fromModel][toModel] = wrapRounded(fn);
		convert[fromModel][toModel].raw = wrapRaw(fn);
	});
});

var colorConvert = convert;

/* MIT license */

var colorString = {
   getRgba: getRgba,
   getHsla: getHsla,
   getRgb: getRgb,
   getHsl: getHsl,
   getHwb: getHwb,
   getAlpha: getAlpha,

   hexString: hexString,
   rgbString: rgbString,
   rgbaString: rgbaString,
   percentString: percentString,
   percentaString: percentaString,
   hslString: hslString,
   hslaString: hslaString,
   hwbString: hwbString,
   keyword: keyword
};

function getRgba(string) {
   if (!string) {
      return;
   }
   var abbr = /^#([a-fA-F0-9]{3})$/,
       hex = /^#([a-fA-F0-9]{6})$/,
       rgba = /^rgba?\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/,
       per = /^rgba?\(\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/,
       keyword = /(\D+)/;

   var rgb = [0, 0, 0],
       a = 1,
       match = string.match(abbr);
   if (match) {
      match = match[1];
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match[i] + match[i], 16);
      }
   } else if (match = string.match(hex)) {
      match = match[1];
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match.slice(i * 2, i * 2 + 2), 16);
      }
   } else if (match = string.match(rgba)) {
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = parseInt(match[i + 1]);
      }
      a = parseFloat(match[4]);
   } else if (match = string.match(per)) {
      for (var i = 0; i < rgb.length; i++) {
         rgb[i] = Math.round(parseFloat(match[i + 1]) * 2.55);
      }
      a = parseFloat(match[4]);
   } else if (match = string.match(keyword)) {
      if (match[1] == "transparent") {
         return [0, 0, 0, 0];
      }
      rgb = colorName[match[1]];
      if (!rgb) {
         return;
      }
   }

   for (var i = 0; i < rgb.length; i++) {
      rgb[i] = scale(rgb[i], 0, 255);
   }
   if (!a && a != 0) {
      a = 1;
   } else {
      a = scale(a, 0, 1);
   }
   rgb[3] = a;
   return rgb;
}

function getHsla(string) {
   if (!string) {
      return;
   }
   var hsl = /^hsla?\(\s*([+-]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)/;
   var match = string.match(hsl);
   if (match) {
      var alpha = parseFloat(match[4]);
      var h = scale(parseInt(match[1]), 0, 360),
          s = scale(parseFloat(match[2]), 0, 100),
          l = scale(parseFloat(match[3]), 0, 100),
          a = scale(isNaN(alpha) ? 1 : alpha, 0, 1);
      return [h, s, l, a];
   }
}

function getHwb(string) {
   if (!string) {
      return;
   }
   var hwb = /^hwb\(\s*([+-]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)/;
   var match = string.match(hwb);
   if (match) {
      var alpha = parseFloat(match[4]);
      var h = scale(parseInt(match[1]), 0, 360),
          w = scale(parseFloat(match[2]), 0, 100),
          b = scale(parseFloat(match[3]), 0, 100),
          a = scale(isNaN(alpha) ? 1 : alpha, 0, 1);
      return [h, w, b, a];
   }
}

function getRgb(string) {
   var rgba = getRgba(string);
   return rgba && rgba.slice(0, 3);
}

function getHsl(string) {
   var hsla = getHsla(string);
   return hsla && hsla.slice(0, 3);
}

function getAlpha(string) {
   var vals = getRgba(string);
   if (vals) {
      return vals[3];
   } else if (vals = getHsla(string)) {
      return vals[3];
   } else if (vals = getHwb(string)) {
      return vals[3];
   }
}

// generators
function hexString(rgb) {
   return "#" + hexDouble(rgb[0]) + hexDouble(rgb[1]) + hexDouble(rgb[2]);
}

function rgbString(rgba, alpha) {
   if (alpha < 1 || rgba[3] && rgba[3] < 1) {
      return rgbaString(rgba, alpha);
   }
   return "rgb(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2] + ")";
}

function rgbaString(rgba, alpha) {
   if (alpha === undefined) {
      alpha = rgba[3] !== undefined ? rgba[3] : 1;
   }
   return "rgba(" + rgba[0] + ", " + rgba[1] + ", " + rgba[2] + ", " + alpha + ")";
}

function percentString(rgba, alpha) {
   if (alpha < 1 || rgba[3] && rgba[3] < 1) {
      return percentaString(rgba, alpha);
   }
   var r = Math.round(rgba[0] / 255 * 100),
       g = Math.round(rgba[1] / 255 * 100),
       b = Math.round(rgba[2] / 255 * 100);

   return "rgb(" + r + "%, " + g + "%, " + b + "%)";
}

function percentaString(rgba, alpha) {
   var r = Math.round(rgba[0] / 255 * 100),
       g = Math.round(rgba[1] / 255 * 100),
       b = Math.round(rgba[2] / 255 * 100);
   return "rgba(" + r + "%, " + g + "%, " + b + "%, " + (alpha || rgba[3] || 1) + ")";
}

function hslString(hsla, alpha) {
   if (alpha < 1 || hsla[3] && hsla[3] < 1) {
      return hslaString(hsla, alpha);
   }
   return "hsl(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%)";
}

function hslaString(hsla, alpha) {
   if (alpha === undefined) {
      alpha = hsla[3] !== undefined ? hsla[3] : 1;
   }
   return "hsla(" + hsla[0] + ", " + hsla[1] + "%, " + hsla[2] + "%, " + alpha + ")";
}

// hwb is a bit different than rgb(a) & hsl(a) since there is no alpha specific syntax
// (hwb have alpha optional & 1 is default value)
function hwbString(hwb, alpha) {
   if (alpha === undefined) {
      alpha = hwb[3] !== undefined ? hwb[3] : 1;
   }
   return "hwb(" + hwb[0] + ", " + hwb[1] + "%, " + hwb[2] + "%" + (alpha !== undefined && alpha !== 1 ? ", " + alpha : "") + ")";
}

function keyword(rgb) {
   return reverseNames[rgb.slice(0, 3)];
}

// helpers
function scale(num, min, max) {
   return Math.min(Math.max(min, num), max);
}

function hexDouble(num) {
   var str = num.toString(16).toUpperCase();
   return str.length < 2 ? "0" + str : str;
}

//create a list of reverse color names
var reverseNames = {};
for (var name in colorName) {
   reverseNames[colorName[name]] = name;
}

/* MIT license */

var Color = function Color(obj) {
	if (obj instanceof Color) {
		return obj;
	}
	if (!(this instanceof Color)) {
		return new Color(obj);
	}

	this.values = {
		rgb: [0, 0, 0],
		hsl: [0, 0, 0],
		hsv: [0, 0, 0],
		hwb: [0, 0, 0],
		cmyk: [0, 0, 0, 0],
		alpha: 1
	};

	// parse Color() argument
	var vals;
	if (typeof obj === 'string') {
		vals = colorString.getRgba(obj);
		if (vals) {
			this.setValues('rgb', vals);
		} else if (vals = colorString.getHsla(obj)) {
			this.setValues('hsl', vals);
		} else if (vals = colorString.getHwb(obj)) {
			this.setValues('hwb', vals);
		} else {
			throw new Error('Unable to parse color from string "' + obj + '"');
		}
	} else if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object') {
		vals = obj;
		if (vals.r !== undefined || vals.red !== undefined) {
			this.setValues('rgb', vals);
		} else if (vals.l !== undefined || vals.lightness !== undefined) {
			this.setValues('hsl', vals);
		} else if (vals.v !== undefined || vals.value !== undefined) {
			this.setValues('hsv', vals);
		} else if (vals.w !== undefined || vals.whiteness !== undefined) {
			this.setValues('hwb', vals);
		} else if (vals.c !== undefined || vals.cyan !== undefined) {
			this.setValues('cmyk', vals);
		} else {
			throw new Error('Unable to parse color from object ' + JSON.stringify(obj));
		}
	}
};

Color.prototype = {
	rgb: function rgb() {
		return this.setSpace('rgb', arguments);
	},
	hsl: function hsl() {
		return this.setSpace('hsl', arguments);
	},
	hsv: function hsv() {
		return this.setSpace('hsv', arguments);
	},
	hwb: function hwb() {
		return this.setSpace('hwb', arguments);
	},
	cmyk: function cmyk() {
		return this.setSpace('cmyk', arguments);
	},

	rgbArray: function rgbArray() {
		return this.values.rgb;
	},
	hslArray: function hslArray() {
		return this.values.hsl;
	},
	hsvArray: function hsvArray() {
		return this.values.hsv;
	},
	hwbArray: function hwbArray() {
		if (this.values.alpha !== 1) {
			return this.values.hwb.concat([this.values.alpha]);
		}
		return this.values.hwb;
	},
	cmykArray: function cmykArray() {
		return this.values.cmyk;
	},
	rgbaArray: function rgbaArray() {
		var rgb = this.values.rgb;
		return rgb.concat([this.values.alpha]);
	},
	rgbaArrayNormalized: function rgbaArrayNormalized() {
		var rgb = this.values.rgb;
		var glRgba = [];
		for (var i = 0; i < 3; i++) {
			glRgba[i] = rgb[i] / 255;
		}
		glRgba.push(this.values.alpha);
		return glRgba;
	},
	hslaArray: function hslaArray() {
		var hsl = this.values.hsl;
		return hsl.concat([this.values.alpha]);
	},
	alpha: function alpha(val) {
		if (val === undefined) {
			return this.values.alpha;
		}
		this.setValues('alpha', val);
		return this;
	},

	red: function red(val) {
		return this.setChannel('rgb', 0, val);
	},
	green: function green(val) {
		return this.setChannel('rgb', 1, val);
	},
	blue: function blue(val) {
		return this.setChannel('rgb', 2, val);
	},
	hue: function hue(val) {
		if (val) {
			val %= 360;
			val = val < 0 ? 360 + val : val;
		}
		return this.setChannel('hsl', 0, val);
	},
	saturation: function saturation(val) {
		return this.setChannel('hsl', 1, val);
	},
	lightness: function lightness(val) {
		return this.setChannel('hsl', 2, val);
	},
	saturationv: function saturationv(val) {
		return this.setChannel('hsv', 1, val);
	},
	whiteness: function whiteness(val) {
		return this.setChannel('hwb', 1, val);
	},
	blackness: function blackness(val) {
		return this.setChannel('hwb', 2, val);
	},
	value: function value(val) {
		return this.setChannel('hsv', 2, val);
	},
	cyan: function cyan(val) {
		return this.setChannel('cmyk', 0, val);
	},
	magenta: function magenta(val) {
		return this.setChannel('cmyk', 1, val);
	},
	yellow: function yellow(val) {
		return this.setChannel('cmyk', 2, val);
	},
	black: function black(val) {
		return this.setChannel('cmyk', 3, val);
	},

	hexString: function hexString() {
		return colorString.hexString(this.values.rgb);
	},
	rgbString: function rgbString() {
		return colorString.rgbString(this.values.rgb, this.values.alpha);
	},
	rgbaString: function rgbaString() {
		return colorString.rgbaString(this.values.rgb, this.values.alpha);
	},
	percentString: function percentString() {
		return colorString.percentString(this.values.rgb, this.values.alpha);
	},
	hslString: function hslString() {
		return colorString.hslString(this.values.hsl, this.values.alpha);
	},
	hslaString: function hslaString() {
		return colorString.hslaString(this.values.hsl, this.values.alpha);
	},
	hwbString: function hwbString() {
		return colorString.hwbString(this.values.hwb, this.values.alpha);
	},
	keyword: function keyword() {
		return colorString.keyword(this.values.rgb, this.values.alpha);
	},

	rgbNumber: function rgbNumber() {
		return this.values.rgb[0] << 16 | this.values.rgb[1] << 8 | this.values.rgb[2];
	},

	luminosity: function luminosity() {
		// http://www.w3.org/TR/WCAG20/#relativeluminancedef
		var rgb = this.values.rgb;
		var lum = [];
		for (var i = 0; i < rgb.length; i++) {
			var chan = rgb[i] / 255;
			lum[i] = chan <= 0.03928 ? chan / 12.92 : Math.pow((chan + 0.055) / 1.055, 2.4);
		}
		return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
	},

	contrast: function contrast(color2) {
		// http://www.w3.org/TR/WCAG20/#contrast-ratiodef
		var lum1 = this.luminosity();
		var lum2 = color2.luminosity();
		if (lum1 > lum2) {
			return (lum1 + 0.05) / (lum2 + 0.05);
		}
		return (lum2 + 0.05) / (lum1 + 0.05);
	},

	level: function level(color2) {
		var contrastRatio = this.contrast(color2);
		if (contrastRatio >= 7.1) {
			return 'AAA';
		}

		return contrastRatio >= 4.5 ? 'AA' : '';
	},

	dark: function dark() {
		// YIQ equation from http://24ways.org/2010/calculating-color-contrast
		var rgb = this.values.rgb;
		var yiq = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
		return yiq < 128;
	},

	light: function light() {
		return !this.dark();
	},

	negate: function negate() {
		var rgb = [];
		for (var i = 0; i < 3; i++) {
			rgb[i] = 255 - this.values.rgb[i];
		}
		this.setValues('rgb', rgb);
		return this;
	},

	lighten: function lighten(ratio) {
		this.values.hsl[2] += this.values.hsl[2] * ratio;
		this.setValues('hsl', this.values.hsl);
		return this;
	},

	darken: function darken(ratio) {
		this.values.hsl[2] -= this.values.hsl[2] * ratio;
		this.setValues('hsl', this.values.hsl);
		return this;
	},

	saturate: function saturate(ratio) {
		this.values.hsl[1] += this.values.hsl[1] * ratio;
		this.setValues('hsl', this.values.hsl);
		return this;
	},

	desaturate: function desaturate(ratio) {
		this.values.hsl[1] -= this.values.hsl[1] * ratio;
		this.setValues('hsl', this.values.hsl);
		return this;
	},

	whiten: function whiten(ratio) {
		this.values.hwb[1] += this.values.hwb[1] * ratio;
		this.setValues('hwb', this.values.hwb);
		return this;
	},

	blacken: function blacken(ratio) {
		this.values.hwb[2] += this.values.hwb[2] * ratio;
		this.setValues('hwb', this.values.hwb);
		return this;
	},

	greyscale: function greyscale() {
		var rgb = this.values.rgb;
		// http://en.wikipedia.org/wiki/Grayscale#Converting_color_to_grayscale
		var val = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
		this.setValues('rgb', [val, val, val]);
		return this;
	},

	clearer: function clearer(ratio) {
		this.setValues('alpha', this.values.alpha - this.values.alpha * ratio);
		return this;
	},

	opaquer: function opaquer(ratio) {
		this.setValues('alpha', this.values.alpha + this.values.alpha * ratio);
		return this;
	},

	rotate: function rotate(degrees) {
		var hue = this.values.hsl[0];
		hue = (hue + degrees) % 360;
		hue = hue < 0 ? 360 + hue : hue;
		this.values.hsl[0] = hue;
		this.setValues('hsl', this.values.hsl);
		return this;
	},

	/**
  * Ported from sass implementation in C
  * https://github.com/sass/libsass/blob/0e6b4a2850092356aa3ece07c6b249f0221caced/functions.cpp#L209
  */
	mix: function mix(mixinColor, weight) {
		var color1 = this;
		var color2 = mixinColor;
		var p = weight === undefined ? 0.5 : weight;

		var w = 2 * p - 1;
		var a = color1.alpha() - color2.alpha();

		var w1 = ((w * a === -1 ? w : (w + a) / (1 + w * a)) + 1) / 2.0;
		var w2 = 1 - w1;

		return this.rgb(w1 * color1.red() + w2 * color2.red(), w1 * color1.green() + w2 * color2.green(), w1 * color1.blue() + w2 * color2.blue()).alpha(color1.alpha() * p + color2.alpha() * (1 - p));
	},

	toJSON: function toJSON() {
		return this.rgb();
	},

	clone: function clone() {
		var col = new Color();
		col.values = clone_1(this.values);
		return col;
	}
};

Color.prototype.getValues = function (space) {
	var vals = {};

	for (var i = 0; i < space.length; i++) {
		vals[space.charAt(i)] = this.values[space][i];
	}

	if (this.values.alpha !== 1) {
		vals.a = this.values.alpha;
	}

	// {r: 255, g: 255, b: 255, a: 0.4}
	return vals;
};

Color.prototype.setValues = function (space, vals) {
	var spaces = {
		rgb: ['red', 'green', 'blue'],
		hsl: ['hue', 'saturation', 'lightness'],
		hsv: ['hue', 'saturation', 'value'],
		hwb: ['hue', 'whiteness', 'blackness'],
		cmyk: ['cyan', 'magenta', 'yellow', 'black']
	};

	var maxes = {
		rgb: [255, 255, 255],
		hsl: [360, 100, 100],
		hsv: [360, 100, 100],
		hwb: [360, 100, 100],
		cmyk: [100, 100, 100, 100]
	};

	var i;
	var alpha = 1;
	if (space === 'alpha') {
		alpha = vals;
	} else if (vals.length) {
		// [10, 10, 10]
		this.values[space] = vals.slice(0, space.length);
		alpha = vals[space.length];
	} else if (vals[space.charAt(0)] !== undefined) {
		// {r: 10, g: 10, b: 10}
		for (i = 0; i < space.length; i++) {
			this.values[space][i] = vals[space.charAt(i)];
		}

		alpha = vals.a;
	} else if (vals[spaces[space][0]] !== undefined) {
		// {red: 10, green: 10, blue: 10}
		var chans = spaces[space];

		for (i = 0; i < space.length; i++) {
			this.values[space][i] = vals[chans[i]];
		}

		alpha = vals.alpha;
	}

	this.values.alpha = Math.max(0, Math.min(1, alpha === undefined ? this.values.alpha : alpha));

	if (space === 'alpha') {
		return false;
	}

	var capped;

	// cap values of the space prior converting all values
	for (i = 0; i < space.length; i++) {
		capped = Math.max(0, Math.min(maxes[space][i], this.values[space][i]));
		this.values[space][i] = Math.round(capped);
	}

	// convert to all the other color spaces
	for (var sname in spaces) {
		if (sname !== space) {
			this.values[sname] = colorConvert[space][sname](this.values[space]);
		}

		// cap values
		for (i = 0; i < sname.length; i++) {
			capped = Math.max(0, Math.min(maxes[sname][i], this.values[sname][i]));
			this.values[sname][i] = Math.round(capped);
		}
	}

	return true;
};

Color.prototype.setSpace = function (space, args) {
	var vals = args[0];

	if (vals === undefined) {
		// color.rgb()
		return this.getValues(space);
	}

	// color.rgb(10, 10, 10)
	if (typeof vals === 'number') {
		vals = Array.prototype.slice.call(args);
	}

	this.setValues(space, vals);
	return this;
};

Color.prototype.setChannel = function (space, index, val) {
	if (val === undefined) {
		// color.red()
		return this.values[space][index];
	} else if (val === this.values[space][index]) {
		// color.red(color.red())
		return this;
	}

	// color.red(100)
	this.values[space][index] = val;
	this.setValues(space, this.values[space]);

	return this;
};

var color = Color;

var shaders = {
    'vertexShader': '\n        attribute vec3 a_position;\n\n        uniform mat4 u_matrix;\n\n        void main() {\n            gl_Position = u_matrix * vec4(a_position, 1.0);\n        }\n    ',
    // fragment shader, can be replaced by layer.options.fragmentShader
    'fragmentShader': '\n        precision mediump float;\n\n        uniform float u_opacity;\n\n        uniform vec4 u_color;\n\n        void main() {\n            gl_FragColor = u_color * u_opacity;\n        }\n    '
};

var dataGridShaders = {
    'vertexShader': '\n        attribute vec3 a_position;\n        attribute vec3 a_color;\n        attribute float a_opacity;\n\n        varying vec4 v_color;\n\n        uniform mat4 u_matrix;\n\n        void main() {\n            v_color = vec4(a_color / 255.0, 1.0) * (a_opacity / 255.0);\n            gl_Position = u_matrix * vec4(a_position, 1.0);\n        }\n    ',
    // fragment shader, can be replaced by layer.options.fragmentShader
    'fragmentShader': '\n        precision mediump float;\n\n        varying vec4 v_color;\n\n        void main() {\n            vec4 color = v_color;\n            // color = vec4(0.0, 0.0, 0.0, 1.0);\n            gl_FragColor = color;\n        }\n    '
};

var GridGLRenderer = function (_GridCanvasRenderer) {
    inherits(GridGLRenderer, _GridCanvasRenderer);

    function GridGLRenderer() {
        classCallCheck(this, GridGLRenderer);
        return possibleConstructorReturn(this, _GridCanvasRenderer.apply(this, arguments));
    }

    GridGLRenderer.prototype.draw = function draw() {
        var grid = this.layer.getGrid();
        if (!grid) {
            this.completeRender();
            return;
        }
        this.prepareCanvas();
        this._setCanvasStyle(this._compiledGridStyle);
        this._drawGrid();
        this._glDrawDataGrid();
        this._drawGlCanvas();
        this._drawAllLabels();
        this.completeRender();
    };

    GridGLRenderer.prototype.drawOnInteracting = function drawOnInteracting() {
        this.draw();
    };

    GridGLRenderer.prototype.reset = function reset() {
        var _this2 = this;

        _GridCanvasRenderer.prototype.reset.call(this);
        delete this.paintedGridNum;
        delete this._dataVertices;
        delete this._dataColors;
        delete this._dataIndices;
        if (this.gl) {
            if (this._buffers) {
                this._buffers.forEach(function (buffer) {
                    _this2.gl.deleteBuffer(buffer);
                });
            }
        }
        delete this.gridBuffer;
        delete this.dataGridBuffer;
        delete this.dataGridIndexBuffer;
        delete this.dataColorsBuffer;
        this._buffers = [];
    };

    GridGLRenderer.prototype._meterToPoint = function _meterToPoint(center, altitude) {
        var map = this.getMap();
        if (map.getGLZoom) {
            // compliance for older version of maptalks
            var z = map.getGLZoom();
            var target = map.locate(center, altitude, 0);
            var p0 = map.coordToPoint(center, z),
                p1 = map.coordToPoint(target, z);
            return Math.abs(p1.x - p0.x) * Util.sign(altitude);
        } else {
            var res = map.getGLRes();
            var _target = map.locate(center, altitude, 0);
            var _p = map.coordToPointAtRes(center, res),
                _p2 = map.coordToPointAtRes(_target, res);
            return Math.abs(_p2.x - _p.x) * Util.sign(altitude);
        }
    };

    GridGLRenderer.prototype._updateUniforms = function _updateUniforms() {
        var gl = this.gl;
        gl.uniformMatrix4fv(this.program['u_matrix'], false, this.getMap().projViewMatrix);
    };

    GridGLRenderer.prototype._useGridProgram = function _useGridProgram() {
        if (!this.gridProgram) {
            this.gridProgram = this.createProgram(shaders['vertexShader'], shaders['fragmentShader'], ['u_matrix', 'u_color', 'u_opacity']);
        }
        this.useProgram(this.gridProgram);
        this.program = this.gridProgram;
    };

    GridGLRenderer.prototype._drawGrid = function _drawGrid() {
        var _this3 = this;

        if (!this.gridBuffer) {
            this.gridBuffer = [];
        }
        this._useGridProgram();
        var colRows = this._preDrawGrid();
        var map = this.getMap(),
            altitude = this.layer.options['altitude'];

        var _loop = function _loop(i) {
            var colRow = colRows[i];
            if (!colRow) {
                return 'continue';
            }
            var cols = colRow['cols'],
                rows = colRow['rows'],
                gridInfo = colRow['gridInfo'];
            var p1 = void 0,
                p2 = void 0;
            var z = 0;
            if (altitude) {
                z = _this3._meterToPoint(map.getCenter(), altitude);
            }

            var count = (cols[1] - cols[0] + 1) * 6 + (rows[1] - rows[0] + 1) * 6;
            var vertices = new Float32Array(count);
            var c = 0;
            var set$$1 = function set$$1(p) {
                vertices[c++] = p;
            };
            //划线
            for (var _i = cols[0]; _i <= cols[1]; _i++) {
                p1 = _this3._getCellNWPoint(_i, rows[0], gridInfo);
                p2 = _this3._getCellNWPoint(_i, rows[1], gridInfo);
                [p1.x, p1.y, z, p2.x, p2.y, z].forEach(set$$1);
            }
            for (var _i2 = rows[0]; _i2 <= rows[1]; _i2++) {
                p1 = _this3._getCellNWPoint(cols[0], _i2, gridInfo);
                p2 = _this3._getCellNWPoint(cols[1], _i2, gridInfo);
                [p1.x, p1.y, z, p2.x, p2.y, z].forEach(set$$1);
            }

            if (!_this3.gridBuffer[i]) {
                _this3.gridBuffer[i] = _this3.createBuffer();
            }
            var gl = _this3.gl;
            gl.lineWidth(_this3._compiledGridStyle.lineWidth || 1);

            _this3._updateUniforms();

            gl.uniform1f(_this3.program['u_opacity'], _this3._compiledGridStyle.lineOpacity || 1);
            var color$$1 = color(_this3._compiledGridStyle.lineColor || '#000').rgbaArrayNormalized();
            gl.uniform4fv(_this3.program['u_color'], color$$1 || [0, 0, 0, 1]);

            gl.bindBuffer(gl.ARRAY_BUFFER, _this3.gridBuffer[i]);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
            _this3.enableVertexAttrib(['a_position', 3]);
            gl.drawArrays(gl.LINES, 0, vertices.length / 3);
            gl.lineWidth(1);
        };

        for (var i = 0; i < colRows.length; i++) {
            var _ret = _loop(i);

            if (_ret === 'continue') continue;
        }
    };

    GridGLRenderer.prototype._useDataGridProgram = function _useDataGridProgram() {
        if (!this.dataGridProgram) {
            this.dataGridProgram = this.createProgram(dataGridShaders['vertexShader'], dataGridShaders['fragmentShader'], ['u_matrix']);
        }
        this.useProgram(this.dataGridProgram);
        this.program = this.dataGridProgram;
    };

    GridGLRenderer.prototype._glDrawDataGrid = function _glDrawDataGrid() {
        var _this4 = this;

        if (!this.paintedGridNum) {
            this.paintedGridNum = [];
            this._dataVertices = [];
            this._dataColors = [];
            this._dataIndices = [];
            this.dataGridBuffer = [];
            this.dataGridIndexBuffer = [];
            this.dataColorsBuffer = [];
        }
        var gl = this.gl;
        this._useDataGridProgram();
        var count = this.layer.getGridCount();

        var _loop2 = function _loop2(i) {
            var grid = _this4.layer.getGrid(i),
                gridInfo = grid['unit'] === 'projection' ? _this4._getProjGridToDraw(grid, i) : _this4._getGridToDraw(grid, i),
                data = grid['data'];
            if (!gridInfo || !Array.isArray(data) || !data.length) {
                return 'continue';
            }

            var isDynamic = Util.isFunction(grid.offset);
            var vertices = _this4._dataVertices[i] || [],
                colors = _this4._dataColors[i] || [];
            var indices = _this4._dataIndices[i] || [];
            if (!_this4.paintedGridNum[i] || isDynamic) {
                var _c = 0;
                data.forEach(function (gridData, index) {
                    if (!gridData[2]['symbol']) {
                        return;
                    }
                    _c = _this4._drawDataGrid({ vertices: vertices, colors: colors, indices: indices }, _c, gridData, _this4._compiledSymbols[i][index], gridInfo);
                });
            }

            if (!_this4.dataGridBuffer[i]) {
                vertices = _this4._dataVertices[i] = new Float32Array(vertices);
                colors = _this4._dataColors[i] = new Uint8Array(colors);
                indices = _this4._dataIndices[i] = new Uint32Array(indices);
                _this4.dataGridBuffer[i] = _this4.createBuffer();
                _this4.dataGridIndexBuffer[i] = _this4.createBuffer();
                _this4.dataColorsBuffer[i] = _this4.createBuffer();
            }

            _this4._updateUniforms();

            gl.bindBuffer(gl.ARRAY_BUFFER, _this4.dataGridBuffer[i]);
            _this4.enableVertexAttrib([['a_position', 3]]);
            if (vertices.length > 0) {
                gl.bufferData(gl.ARRAY_BUFFER, vertices, isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, _this4.dataColorsBuffer[i]);
            _this4.enableVertexAttrib([['a_color', 3, 'UNSIGNED_BYTE'], ['a_opacity', 1, 'UNSIGNED_BYTE']]);
            if (colors.length > 0) {
                gl.bufferData(gl.ARRAY_BUFFER, colors, isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
            }

            // Write the indices to the buffer object
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, _this4.dataGridIndexBuffer[i]);
            if (indices.length > 0) {
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
                _this4.paintedGridNum[i] = indices.length;
            }
            gl.drawElements(gl.TRIANGLES, _this4.paintedGridNum[i], gl.UNSIGNED_INT, 0);
        };

        for (var i = 0; i < count; i++) {
            var _ret2 = _loop2(i);

            if (_ret2 === 'continue') continue;
        }

        gl.disableVertexAttribArray(gl.getAttribLocation(gl.program, 'a_position'));
        gl.disableVertexAttribArray(gl.getAttribLocation(gl.program, 'a_color'));
        gl.disableVertexAttribArray(gl.getAttribLocation(gl.program, 'a_opacity'));
    };

    GridGLRenderer.prototype._drawDataGrid = function _drawDataGrid(_ref, c, gridData, symbol, gridInfo) {
        var vertices = _ref.vertices,
            indices = _ref.indices,
            colors = _ref.colors;

        var map = this.getMap();
        var cols = Array.isArray(gridData[0]) ? gridData[0] : [gridData[0], gridData[0]],
            rows = Array.isArray(gridData[1]) ? gridData[1] : [gridData[1], gridData[1]],
            altitude = this.layer.options['altitude'];
        var z = 0;
        if (altitude) {
            z = this._meterToPoint(map.getCenter(), altitude);
        }

        var b = c / 3 * 4,
            a = c / 2;

        var set$$1 = function set$$1(p) {
            vertices[c++] = p;
        };

        var setIndices = function setIndices(p) {
            indices[a++] = p;
        };

        var setColor = function setColor(p) {
            colors[b++] = p;
        };

        var color$$1 = symbol['polygonFill'];
        var opacity = symbol['polygonOpacity'] === undefined ? 1 : symbol['polygonOpacity'];
        if (!color$$1) {
            color$$1 = '#fff';
            opacity = 0;
        }

        var style = color(color$$1).rgbaArray();
        style[3] *= opacity * 255;

        var p1 = void 0,
            p2 = void 0,
            p3 = void 0,
            p4 = void 0;
        for (var i = cols[0]; i <= cols[1]; i++) {
            for (var ii = rows[0]; ii <= rows[1]; ii++) {
                p1 = this._getCellNWPoint(i, ii, gridInfo);
                p3 = this._getCellNWPoint(i + 1, ii + 1, gridInfo);

                p2 = p1.add(p3.x - p1.x, 0);
                // p3 = p1.add(w, h);
                p4 = p1.add(0, p3.y - p1.y);
                var idx = c / 3;
                setIndices(idx);
                setIndices(idx + 1);
                setIndices(idx + 2);
                setIndices(idx);
                setIndices(idx + 2);
                setIndices(idx + 3);
                set$$1(p1.x);
                set$$1(p1.y);
                set$$1(z);
                style.forEach(setColor);
                set$$1(p2.x);
                set$$1(p2.y);
                set$$1(z);
                style.forEach(setColor);
                set$$1(p3.x);
                set$$1(p3.y);
                set$$1(z);
                style.forEach(setColor);
                set$$1(p4.x);
                set$$1(p4.y);
                set$$1(z);
                style.forEach(setColor);
            }
        }

        return c;
    };

    GridGLRenderer.prototype._getCellNWPoint = function _getCellNWPoint(col, row, gridInfo) {
        var map = this.getMap();
        var res = map.getGLRes ? map.getGLRes() : null;
        var glZoom = map.getGLZoom ? map.getGLZoom() : null;
        if (gridInfo['unit'] === 'projection') {
            var p = new Point(gridInfo.center.x + col * gridInfo.width, gridInfo.center.y + row * gridInfo.height);
            if (res !== null) {
                return map._pointToPointAtRes(p, res);
            } else {
                return map._pointToPointAtZoom(p, glZoom);
            }
        } else if (gridInfo['unit'] === 'meter') {
            var center = gridInfo.center;
            var target = map.locate(center, gridInfo.width * col, -gridInfo.height * row);
            if (res !== null) {
                return map.coordToPointAtRes(target, res);
            } else {
                return map.coordToPoint(target, glZoom);
            }
        } else if (gridInfo['unit'] === 'degree') {
            var _center = gridInfo.center;
            var _target2 = _center.add(col * gridInfo.width, -row * gridInfo.height);
            if (res !== null) {
                return map.coordToPointAtRes(_target2, res);
            } else {
                return map.coordToPoint(_target2, glZoom);
            }
        }
        return null;
    };

    GridGLRenderer.prototype._drawAllLabels = function _drawAllLabels() {
        var _this5 = this;

        var count = this.layer.getGridCount();

        var _loop3 = function _loop3(i) {
            var grid = _this5.layer.getGrid(i),
                gridInfo = grid['unit'] === 'projection' ? _this5._getProjGridToDraw(grid, i) : _this5._getGridToDraw(grid, i),
                data = grid['data'];
            if (!gridInfo || !Array.isArray(data) || !data.length) {
                return 'continue';
            }
            data.forEach(function (gridData, index) {
                _this5._drawLabel(i, gridData, index, gridInfo);
            });
        };

        for (var i = 0; i < count; i++) {
            var _ret3 = _loop3(i);

            if (_ret3 === 'continue') continue;
        }
    };

    GridGLRenderer.prototype.onRemove = function onRemove() {
        _GridCanvasRenderer.prototype.onRemove.call(this);
        // release resources
        var gl = this.gl;
        if (!gl) {
            return;
        }
        if (this._buffers) {
            this._buffers.forEach(function (b) {
                gl.deleteBuffer(b);
            });
            delete this._buffers;
        }
        if (this._textures) {
            this._textures.forEach(function (t) {
                return gl.deleteTexture(t);
            });
            delete this._textures;
        }
        var program = gl.program;
        gl.deleteProgram(program);
        gl.deleteShader(program.fragmentShader);
        gl.deleteShader(program.vertexShader);
        delete this.paintedGridNum;
        delete this._dataVertices;
        delete this._dataColors;
        delete this._dataIndices;
    };

    GridGLRenderer.prototype.onCanvasCreate = function onCanvasCreate() {
        //create a canvas2 to draw grids with webgl
        //texts will be still drawn by (this.canvas + this.context)
        this.canvas2 = Canvas.createCanvas(this.canvas.width, this.canvas.height);
        var gl = this.gl = this._createGLContext(this.canvas2, this.layer.options['glOptions']);
        gl.getExtension('OES_element_index_uint');
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        // const map = this.getMap();
        // gl.viewport(0, 0, map.width, map.height);
        // gl.disable(gl.DEPTH_TEST);
        // gl.disable(gl.STENCIL_TEST);
    };

    GridGLRenderer.prototype.resizeCanvas = function resizeCanvas(canvasSize) {
        if (!this.canvas) {
            return;
        }
        _GridCanvasRenderer.prototype.resizeCanvas.call(this, canvasSize);
        if (this.canvas2.width !== this.canvas.width || this.canvas2.height !== this.canvas.height) {
            this.canvas2.width = this.canvas.width;
            this.canvas2.height = this.canvas.height;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    };

    GridGLRenderer.prototype.clearCanvas = function clearCanvas() {
        if (!this.canvas) {
            return;
        }
        _GridCanvasRenderer.prototype.clearCanvas.call(this);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    };

    GridGLRenderer.prototype._drawGlCanvas = function _drawGlCanvas() {
        var ctx = this.context;
        var map = this.getMap();
        var dpr = map.getDevicePixelRatio ? map.getDevicePixelRatio() : 2;
        if (Browser.retina) {
            ctx.save();
            // ctx.translate(map.width / 2 / dpr, map.height / 2 / dpr);
            ctx.scale(1 / dpr, 1 / dpr);
        }
        // draw gl canvas on layer canvas
        ctx.drawImage(this.canvas2, 0, 0, this.canvas2.width, this.canvas2.height);
        if (Browser.retina) {
            ctx.restore();
        }
    };

    //----------------------- webgl utils unlike to change ---------------------------------

    GridGLRenderer.prototype.createBuffer = function createBuffer() {
        var gl = this.gl;
        // Create the buffer object
        var buffer = gl.createBuffer();
        if (!buffer) {
            throw new Error('Failed to create the buffer object');
        }
        if (!this._buffers) {
            this._buffers = [];
        }
        this._buffers.push(buffer);
        return buffer;
    };

    /**
     *
     * @param {Array} attributes [[name, stride, type], [name, stride, type]...]
     */


    GridGLRenderer.prototype.enableVertexAttrib = function enableVertexAttrib(attributes) {
        var gl = this.gl;
        if (Array.isArray(attributes[0])) {
            var STRIDE = 0;
            for (var i = 0; i < attributes.length; i++) {
                STRIDE += attributes[i][1] || 0;
            }
            var offset = 0;
            for (var _i3 = 0; _i3 < attributes.length; _i3++) {
                var attr = gl.getAttribLocation(gl.program, attributes[_i3][0]);
                if (attr < 0) {
                    throw new Error('Failed to get the storage location of ' + attributes[_i3][0]);
                }
                var FSIZE = void 0;
                if (!attributes[_i3][2] || attributes[_i3][2] === 'FLOAT') {
                    FSIZE = 4;
                } else if (attributes[_i3][2] === 'BYTE' || attributes[_i3][2] === 'UNSIGNED_BYTE') {
                    FSIZE = 1;
                } else {
                    FSIZE = 2;
                }
                gl.enableVertexAttribArray(attr);
                gl.vertexAttribPointer(attr, attributes[_i3][1], gl[attributes[_i3][2] || 'FLOAT'], false, FSIZE * STRIDE, FSIZE * offset);
                offset += attributes[_i3][1] || 0;
            }
        } else {
            var _attr = gl.getAttribLocation(gl.program, attributes[0]);
            gl.enableVertexAttribArray(_attr);
            gl.vertexAttribPointer(_attr, attributes[1], gl[attributes[2] || 'FLOAT'], false, 0, 0);
        }
    };

    /**
     * Create the linked program object
     * @param vshader a vertex shader program (string)
     * @param fshader a fragment shader program (string)
     * @return created program object, or null if the creation has failed
     */


    GridGLRenderer.prototype.createProgram = function createProgram(vshader, fshader, uniforms) {
        var gl = this.gl;
        // Create shader object
        var vertexShader = this._compileShader(gl, gl.VERTEX_SHADER, vshader);
        var fragmentShader = this._compileShader(gl, gl.FRAGMENT_SHADER, fshader);
        if (!vertexShader || !fragmentShader) {
            return null;
        }

        // Create a program object
        var program = gl.createProgram();
        if (!program) {
            return null;
        }

        // Attach the shader objects
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);

        // Link the program object
        gl.linkProgram(program);
        gl.vertexShader = vertexShader;
        gl.fragmentShader = fragmentShader;
        // Check the result of linking
        var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!linked) {
            var error = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            gl.deleteShader(fragmentShader);
            gl.deleteShader(vertexShader);
            throw new Error('Failed to link program: ' + error);
        }

        this._initUniforms(program, uniforms);

        return program;
    };

    GridGLRenderer.prototype.useProgram = function useProgram(program) {
        var gl = this.gl;
        gl.useProgram(program);
        gl.program = program;
        return this;
    };

    GridGLRenderer.prototype.enableSampler = function enableSampler(sampler, texIdx) {
        var gl = this.gl;
        var uSampler = this._getUniform(gl.program, sampler);
        if (!texIdx) {
            texIdx = 0;
        }
        // Set the texture unit to the sampler
        gl.uniform1i(uSampler, texIdx);
        return uSampler;
    };

    GridGLRenderer.prototype._createGLContext = function _createGLContext(canvas) {
        var attributes = {
            'alpha': true,
            'preserveDrawingBuffer': true
        };
        var names = ['webgl', 'experimental-webgl'];
        var context = null;
        /* eslint-disable no-empty */
        for (var i = 0; i < names.length; ++i) {
            try {
                context = canvas.getContext(names[i], attributes);
            } catch (e) {}
            if (context) {
                break;
            }
        }
        return context;
        /* eslint-enable no-empty */
    };

    /**
     * Create a shader object
     * @param gl GL context
     * @param type the type of the shader object to be created
     * @param source shader program (string)
     * @return created shader object, or null if the creation has failed.
     */


    GridGLRenderer.prototype._compileShader = function _compileShader(gl, type, source) {
        // Create shader object
        var shader = gl.createShader(type);
        if (shader == null) {
            throw new Error('unable to create shader');
        }

        // Set the shader program
        gl.shaderSource(shader, source);
        // Compile the shader
        gl.compileShader(shader);

        // Check the result of compilation
        var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!compiled) {
            var error = gl.getShaderInfoLog(shader);

            gl.deleteShader(shader);
            throw new Error('Failed to compile shader: ' + error);
        }

        return shader;
    };

    GridGLRenderer.prototype._initUniforms = function _initUniforms(program, uniforms) {
        for (var i = 0; i < uniforms.length; i++) {
            var name = uniforms[i];
            var uniform = uniforms[i];
            var b = name.indexOf('[');
            if (b >= 0) {
                name = name.substring(0, b);
                uniform = uniform.substring(0, b);
            }
            program[name] = this._getUniform(program, uniform);
        }
    };

    GridGLRenderer.prototype._getUniform = function _getUniform(program, uniformName) {
        var gl = this.gl;
        var uniform = gl.getUniformLocation(program, uniformName);
        if (!uniform) {
            throw new Error('Failed to get the storage location of ' + uniformName);
        }
        return uniform;
    };

    return GridGLRenderer;
}(GridCanvasRenderer);

GridGLRenderer.include({

    copy16: function () {
        var m = Browser.ie9 ? null : new Float32Array(16);
        return function (arr) {
            for (var i = 0; i < 16; i++) {
                m[i] = arr[i];
            }
            return m;
        };
    }()
});

GridLayer.registerRenderer('canvas', GridCanvasRenderer);
GridLayer.registerRenderer('gl', GridGLRenderer);

GridLayer.mergeOptions({
    'renderer': 'gl'
});

export { GridLayer };

typeof console !== 'undefined' && console.log('maptalks.gridlayer v0.6.8, requires maptalks@<2.0.0.');

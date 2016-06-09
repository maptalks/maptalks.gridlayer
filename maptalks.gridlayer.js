(function () {
    'use strict';

    var maptalks;

    var nodeEnv = typeof module !== 'undefined' && module.exports;
    if (nodeEnv)  {
        maptalks = require('maptalks');
    } else {
        maptalks = window.maptalks;
    }

    var defaultSymbol = {
        'lineColor' : '#bbb',
        'lineWidth' : 1,
        'lineOpacity' : 1,
        'lineDasharray': [],
        'lineCap' : 'butt',
        'lineJoin' : 'round',
        'polygonOpacity' : 0
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
    maptalks.GridLayer = maptalks.Layer.extend({


        options: {
            'symbol' : maptalks.Util.extend({}, defaultSymbol),
            'debug'  : false
        },

        initialize: function (id, grid, options) {
            this.setId(id);
            this._grid = grid;
            maptalks.Util.setOptions(this, options);
        },

        /**
         * [getGrid description]
         * @return {[type]} [description]
         */
        getGrid: function () {
            return this._grid;
        },

        setGrid: function (grid) {
            this._grid = grid;
            return this.redraw();
        },

        redraw: function () {
            this._getRenderer().render();
            return this;
        },

        isEmpty: function () {
            if (!this._grid) {
                return true;
            }
            return false;
        },

        clear: function () {
            delete this._grid;
            this.fire('clear');
            return this.redraw();
        },

        identify: function (coordinate) {
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
                var extent = new maptalks.Extent(
                        cols[0] === '*' ? -Number.MAX_VALUE : gridCenter + cols[0] * cellW,
                        rows[0] === '*' ? -Number.MAX_VALUE : gridCenter + rows[0] * cellH,
                        cols[1] === '*' ? Number.MAX_VALUE : gridCenter + cols[1] * cellW,
                        rows[1] === '*' ? Number.MAX_VALUE : gridCenter + rows[1] * cellH
                    );
                if (!extent.contains(point)) {
                    return null;
                }
                var delta = 1E-6;
                var col = Math.ceil(Math.abs(point.x - gridCenter.x) / cellW - delta),
                    row = Math.ceil(Math.abs(point.y - gridCenter.y) / cellH - delta);
                col =  (point.x > gridCenter.x) ? col - 1 : -col;
                row =  (point.y > gridCenter.y) ? row - 1 : -row;
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
        }
    });

    /**
     * Export the GridLayer's profile JSON.
     * @return {Object} layer's profile JSON
     */
    maptalks.GridLayer.prototype.toJSON = function () {
        var grid = this.getGrid();
        if (grid['center'] instanceof maptalks.Coordinate) {
            grid['center'] = grid['center'].toArray();
        }
        var profile = {
            'type'      : 'GridLayer',
            'id'        : this.getId(),
            'options'   : this.config(),
            'grid'      : grid
        };
        return profile;
    };

    /**
     * Reproduce a GridLayer from layer's profile JSON.
     * @param  {Object} layerJSON - layer's profile JSON
     * @return {maptalks.GridLayer}
     * @static
     * @private
     * @function
     */
    maptalks.GridLayer._fromJSON = function (layerJSON) {
        if (!layerJSON || layerJSON['type'] !== 'GridLayer') { return null; }
        return new maptalks.GridLayer(layerJSON['id'], layerJSON['grid'], layerJSON['options']);
    };

    maptalks.renderer.gridlayer = {};

    maptalks.renderer.gridlayer.Canvas = maptalks.renderer.Canvas.extend({

        initialize: function (layer) {
            this._layer = layer;
        },

        _render: function () {
            var grid = this._layer.getGrid();
            if (!grid) {
                this._complete();
                return;
            }
            this._prepareCanvas();
            if (!this._compiledGridStyle) {
                this._compiledGridStyle = maptalks.Util.loadFunctionTypes(this._layer.options['symbol'], maptalks.Util.bind(function () {
                    return [this.getMap() ? this.getMap().getZoom() : null, null];
                }, this));
            }
            this._setCanvasStyle(this._compiledGridStyle);
            this._drawGrid();
            this._drawData();
            this._complete();
        },

        _drawGrid: function () {
            var grid = this._layer.getGrid(),
                gridInfo = grid['projection'] ? this._getProjGridToDraw() : this._getGridToDraw();
            if (!gridInfo) {
                return;
            }
            var cols = gridInfo.cols,
                rows = gridInfo.rows,
                cellW = gridInfo.width,
                cellH = gridInfo.height,
                p1, p2;
            this._context.beginPath();
            if (cellW < 0.5 || cellH < 0.5 || this._compiledGridStyle['polygonOpacity'] > 0) {
                p1 = this._getCellNW(cols[0], rows[0], gridInfo);
                p2 = this._getCellNW(cols[1] + 1, rows[1] + 1, gridInfo);
                this._context.rect(p1.x, p2.y, p2.x - p1.x, p2.y - p1.y);
                if (this._compiledGridStyle['polygonOpacity'] > 0) {
                    maptalks.Canvas.fillCanvas(this._context, this._compiledGridStyle['polygonOpacity']);
                } else {
                    this._context.fill();
                }
                if (cellW < 0.5 || cellH < 0.5) {
                    return;
                }
            }
            var i;
            for (i = cols[0]; i <= cols[1]; i++) {
                p1 = this._getCellNW(i, rows[0], gridInfo);
                p2 = this._getCellNW(i, rows[1] + 1, gridInfo);
                this._context.moveTo(p1[0], p1[1]);
                this._context.lineTo(p2[0], p2[1]);
            }
            for (i = rows[0]; i <= rows[1]; i++) {
                p1 = this._getCellNW(cols[0], i, gridInfo);
                p2 = this._getCellNW(cols[1], i, gridInfo);
                this._context.moveTo(p1[0], p1[1]);
                this._context.lineTo(p2[0], p2[1]);
            }
            maptalks.Canvas._stroke(this._context, this._compiledGridStyle['lineOpacity']);
        },

        _getProjGridToDraw: function () {
            var grid = this._layer.getGrid(),
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
            var view = new maptalks.PointExtent(
                    -center.x > 0 ? Math.ceil(-center.x / width - delta) - 1 : -Math.ceil(center.x / width - delta),
                    -center.y > 0 ? Math.ceil(-center.y / height - delta) - 1 : -Math.ceil(center.y / height - delta),
                    cxmax > 0 ? Math.ceil(cxmax / width - delta) : -Math.ceil(cxmax / width - delta),
                    cymax > 0 ? Math.ceil(cymax / height - delta) : -Math.ceil(cymax / height - delta)
                );
            var full = new maptalks.PointExtent(
                    //xmin, ymin
                    gridX[0] === '*' ? view.xmin : gridX[0], gridY[0] === '*' ? view.ymin : gridY[0],
                    //xmax, ymax
                    gridX[1] === '*' ? view.xmax : gridX[1], gridY[1] === '*' ? view.ymax : gridY[1]
                );
            var intersection = view.intersection(full);
            if (!intersection) {
                return null;
            }
            return {
                cols : [intersection.xmin, intersection.xmax],
                rows : [intersection.ymin, intersection.ymax],
                width : width,
                height : height,
                center : center
            };
        },

        _getCellNW: function (col, row, gridInfo) {
            var grid = this._layer.getGrid();
            if (grid['projection']) {
                return [gridInfo.center.x + col * gridInfo.width, gridInfo.center.y + row * gridInfo.height];
            }
            return null;
        },

        _getCellCenter: function (col, row, gridInfo) {
            var grid = this._layer.getGrid();
            if (grid['projection']) {
                return [gridInfo.center.x + (col + 1 / 2) * gridInfo.width, gridInfo.center.y + (row + 1 / 2) * gridInfo.height];
            }
            return null;
        },

        _drawData: function () {
            var grid = this._layer.getGrid(),
                gridInfo = grid['projection'] ? this._getProjGridToDraw() : this._getGridToDraw(),
                data = this._layer.getGrid()['data'];
            if (!Array.isArray(data) || !data.length) {
                return;
            }
            var map = this.getMap();
            if (!this._compiledSymbols) {
                this._compiledSymbols = [];
            }
            if (!this._gridSymbolTests) {
                this._gridSymbolTests = [];
            }
            data.forEach(function (gridData, index) {
                if (!gridData[2]['symbol']) {
                    return;
                }
                var symbol = this._compiledSymbols[index];
                if (!symbol) {
                    var argFn = (function (props) {
                        return function () {
                            return [map.getZoom(), props];
                        };
                    })(gridData[2]['properties']);
                    symbol = maptalks.Util.loadFunctionTypes(gridData[2]['symbol'], argFn);
                    this._compiledSymbols[index] = symbol;
                }
                this._drawDataGrid(gridData, symbol, gridInfo);
                if (maptalks.Util.isNil(this._gridSymbolTests[index])) {
                    this._gridSymbolTests[index] = this._testSymbol(gridData[2]['symbol']);
                }
                if (this._gridSymbolTests[index]) {
                    this._drawDataCenter(gridData, index, gridInfo);
                }
            }, this);
        },

        _drawDataGrid: function (gridData, symbol, gridInfo) {
            var map = this.getMap(),
                mapSize = map.getSize(),
                mapExtent = new maptalks.PointExtent(0, 0, mapSize.width, mapSize.height);
            var painted = false;
            var cols = Array.isArray(gridData[0]) ? gridData[0] : [gridData[0], gridData[0]],
                rows = Array.isArray(gridData[1]) ? gridData[1] : [gridData[1], gridData[1]],
                i, ii, p1, p2, gridExtent;
            for (i = cols[0]; i <= cols[1]; i++) {
                for (ii = rows[0]; ii <= rows[1]; ii++) {
                    p1 = this._getCellNW(i, ii, gridInfo);
                    p2 = this._getCellNW(i + 1, ii + 1, gridInfo);
                    gridExtent = new maptalks.PointExtent(p1[0], p1[1], p2[0], p2[1]);
                    if (!mapExtent.intersects(gridExtent)) {
                        continue;
                    }
                    if (!painted) {
                        painted = true;
                        this._setCanvasStyle(symbol);
                        this._context.beginPath();
                    }
                    this._context.rect(Math.ceil(p1[0]), Math.ceil(p1[1]), Math.ceil(p2[0] - p1[0]), Math.ceil(p2[1] - p1[1]));
                }
            }
            if (painted) {
                maptalks.Canvas.fillCanvas(this._context, symbol['polygonOpacity']);
            }
        },

        _testSymbol: function (symbol) {
            for (var i = this._symbolizers.length - 1; i >= 0; i--) {
                if (this._symbolizers[i].test(symbol)) {
                    return true;
                }
            }
            return false;
        },

        _symbolizers : [
            maptalks.symbolizer.ImageMarkerSymbolizer,
            maptalks.symbolizer.TextMarkerSymbolizer,
            maptalks.symbolizer.VectorMarkerSymbolizer,
            maptalks.symbolizer.VectorPathMarkerSymbolizer
        ],

        _drawDataCenter: function (gridData, index, gridInfo) {
            var symbol = gridData[2]['symbol'];
            var map = this.getMap(),
                extent = map.getExtent();
            var dataMarkers = this._dataMarkers;
            if (!dataMarkers) {
                this._dataMarkers = dataMarkers = [];
            }
            var coordinates = [];
            var cols = Array.isArray(gridData[0]) ? gridData[0] : [gridData[0], gridData[0]],
                rows = Array.isArray(gridData[1]) ? gridData[1] : [gridData[1], gridData[1]],
                i, ii, p, c;
            for (i = cols[0]; i <= cols[1]; i++) {
                for (ii = rows[0]; ii <= rows[1]; ii++) {
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
                    'symbol' : lineSymbol,
                    'debug' : this._layer.options['debug']
                });
                line._bindLayer(this._layer);
                dataMarkers[index] = line;
            } else {
                line.setCoordinates(coordinates);
            }
            line._getPainter().paint();
        },

        _setCanvasStyle : function (symbol) {
            var extend = maptalks.Util.extend({}, defaultSymbol, symbol);
            maptalks.Canvas.prepareCanvas(this._context, extend);
        }

    });

    maptalks.GridLayer.registerRenderer('canvas', maptalks.renderer.gridlayer.Canvas);

    if (nodeEnv) {
        exports = module.exports = maptalks.GridLayer;
    }
})();

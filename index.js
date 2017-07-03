import * as maptalks from 'maptalks';

const defaultSymbol = {
    'lineColor' : '#bbb',
    'lineWidth' : 1,
    'lineOpacity' : 1,
    'lineDasharray': [],
    'lineCap' : 'butt',
    'lineJoin' : 'round',
    'polygonOpacity' : 0
};

const options = {
    'symbol' : maptalks.Util.extend({}, defaultSymbol),
    'debug'  : false
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
export class GridLayer extends maptalks.Layer {

    constructor(id, grid, options) {
        super(id, options);
        this._grid = grid;
    }

    /**
     * [getGrid description]
     * @return {[type]} [description]
     */
    getGrid() {
        return this._grid;
    }

    setGrid(grid) {
        this._grid = grid;
        return this.redraw();
    }

    redraw() {
        if (this._getRenderer()) {
            this._getRenderer().redraw();
        }
        return this;
    }

    isEmpty() {
        if (!this._grid) {
            return true;
        }
        return false;
    }

    clear() {
        delete this._grid;
        this.fire('clear');
        return this.redraw();
    }

    identify(coordinate) {
        const map = this.getMap(),
            grid = this.getGrid(),

            cols = grid.cols || ['*', '*'],
            rows = grid.rows || ['*', '*'];
        if (!grid['projection']) {
            return null;
        }
        const res = map._getResolution(),
            cellW = grid.width / res,
            cellH = grid.height / res;
        const gridCenter = map.coordinateToContainerPoint(new maptalks.Coordinate(grid['center'])),
            point = map.coordinateToContainerPoint(coordinate);
        const extent = new maptalks.Extent(
                cols[0] === '*' ? -Number.MAX_VALUE : gridCenter.x + cols[0] * cellW,
                rows[0] === '*' ? -Number.MAX_VALUE : gridCenter.y + rows[0] * cellH,
                cols[1] === '*' ? Number.MAX_VALUE : gridCenter.x + cols[1] * cellW,
                rows[1] === '*' ? Number.MAX_VALUE : gridCenter.y + rows[1] * cellH
            );
        if (!extent.contains(point)) {
            return null;
        }
        const delta = 1E-6;
        let col = Math.ceil(Math.abs(point.x - gridCenter.x) / cellW - delta),
            row = Math.ceil(Math.abs(point.y - gridCenter.y) / cellH - delta);
        col =  (point.x > gridCenter.x) ? col - 1 : -col;
        row =  (point.y > gridCenter.y) ? row - 1 : -row;
        const cnw = gridCenter.add(cellW * col, cellH * row);
        const nw = map.containerPointToCoordinate(cnw),
            ne = map.containerPointToCoordinate(cnw.add(cellW, 0)),
            sw = map.containerPointToCoordinate(cnw.add(0, cellH));
        const w = map.computeLength(nw, ne),
            h = map.computeLength(nw, sw);
        return new maptalks.Rectangle(nw, w, h);
    }

    /**
     * Export the GridLayer's JSON.
     * @return {Object} layer's JSON
     */
    toJSON() {
        const grid = this.getGrid();
        if (grid['center'] instanceof maptalks.Coordinate) {
            grid['center'] = grid['center'].toArray();
        }
        return {
            'type'      : 'GridLayer',
            'id'        : this.getId(),
            'options'   : this.config(),
            'grid'      : grid
        };
    }

    /**
     * Reproduce a GridLayer from layer's JSON.
     * @param  {Object} json - layer's JSON
     * @return {maptalks.GridLayer}
     * @static
     * @private
     * @function
     */
    static fromJSON(json) {
        if (!json || json['type'] !== 'GridLayer') { return null; }
        return new GridLayer(json['id'], json['grid'], json['options']);
    }
}

GridLayer.mergeOptions(options);

GridLayer.registerJSONType('GridLayer');

const symbolizers = [
    maptalks.symbolizer.ImageMarkerSymbolizer,
    maptalks.symbolizer.TextMarkerSymbolizer,
    maptalks.symbolizer.VectorMarkerSymbolizer,
    maptalks.symbolizer.VectorPathMarkerSymbolizer
];

GridLayer.registerRenderer('canvas', class extends maptalks.renderer.CanvasRenderer {

    draw() {
        const grid = this.layer.getGrid();
        if (!grid) {
            this.completeRender();
            return;
        }
        this.prepareCanvas();
        this._setCanvasStyle(this._compiledGridStyle);
        this._drawGrid();
        this._drawData();
        this.completeRender();
    }

    drawOnInteracting() {
        this.draw();
    }

    checkResources() {
        this._compileStyles();
        if (this._resources) {
            return null;
        }
        let resources = [];
        if (this._compiledGridStyle) {
            resources = maptalks.Util.getExternalResources(this._compiledGridStyle);
        }
        if (this._compiledSymbols) {
            this._compiledSymbols.forEach(function (s) {
                const c = maptalks.Util.getExternalResources(s);
                if (c) {
                    resources = resources.concat(c);
                }
            });
        }
        return resources;
    }

    redraw() {

    }

    _compileStyles() {
        if (!this._compiledGridStyle) {
            const symbol = maptalks.Util.convertResourceUrl(this.layer.options['symbol']);
            this._compiledGridStyle = maptalks.MapboxUtil.loadFunctionTypes(symbol, () => {
                return [this.getMap() ? this.getMap().getZoom() : null, null];
            });
        }
        if (!this._compiledSymbols) {
            const map = this.getMap(),
                grid = this.layer.getGrid(),
                data = grid['data'];
            this._compiledSymbols = [];
            if (data) {
                data.forEach((gridData, index) => {
                    if (!gridData[2]['symbol']) {
                        return;
                    }
                    const argFn = (function (props) {
                        return function () {
                            return [map.getZoom(), props];
                        };
                    })(gridData[2]['properties']);
                    const s = maptalks.Util.convertResourceUrl(gridData[2]['symbol']);
                    this._compiledSymbols[index] = maptalks.MapboxUtil.loadFunctionTypes(s, argFn);
                });
            }
        }
    }

    _drawGrid() {
        const grid = this.layer.getGrid(),
            gridInfo = grid['projection'] ? this._getProjGridToDraw() : this._getGridToDraw();
        if (!gridInfo) {
            return;
        }
        const cols = gridInfo.cols,
            rows = gridInfo.rows,
            // cellW = gridInfo.width,
            // cellH = gridInfo.height,
            p0 = this._getCellNW(cols[0], rows[0], gridInfo);
        let p1, p2;
        this.context.beginPath();
        // if (cellW < 0.5 || cellH < 0.5 || (this._compiledGridStyle['polygonOpacity'] > 0 || this._compiledGridStyle['polygonColor'] || this._compiledGridStyle['polygonPatternFile'])) {
        //     p2 = this._getCellNW(cols[1] + 1, rows[1] + 1, gridInfo);
        //     this.context.rect(p0[0], p0[1], p2[0] - p0[0], p2[1] - p0[1]);
        //     if (this._compiledGridStyle['polygonOpacity'] > 0) {
        //         maptalks.Canvas.fillCanvas(this.context, this._compiledGridStyle['polygonOpacity'], p0[0], p0[1]);
        //     } else {
        //         maptalks.Canvas.fillCanvas(this.context, 1, p0[0], p0[1]);
        //     }
        //     if (cellW < 0.5 || cellH < 0.5) {
        //         return;
        //     }
        // }
        for (let i = cols[0]; i <= cols[1] + 1; i++) {
            p1 = this._getCellNW(i, rows[0], gridInfo);
            p2 = this._getCellNW(i, rows[1] + 1, gridInfo);
            this.context.moveTo(p1.x, p1.y);
            this.context.lineTo(p2.x, p2.y);
        }
        for (let i = rows[0]; i <= rows[1] + 1; i++) {
            p1 = this._getCellNW(cols[0], i, gridInfo);
            p2 = this._getCellNW(cols[1] + 1, i, gridInfo);
            this.context.moveTo(p1.x, p1.y);
            this.context.lineTo(p2.x, p2.y);
        }
        maptalks.Canvas._stroke(this.context, this._compiledGridStyle['lineOpacity'], p0.x, p0.y);
    }

    _getProjGridToDraw() {
        const grid = this.layer.getGrid(),
            map = this.getMap(),
            projection = map.getProjection(),
            extent = map._get2DExtent(),
            gridX = grid.cols || [Infinity, Infinity],
            gridY = grid.rows || [Infinity, Infinity],
            gridCenter = new maptalks.Coordinate(grid.center),
            center = map.coordinateToPoint(gridCenter),
            target = projection.project(gridCenter)._add(grid.width, grid.height),
            ptarget = map._prjToPoint(target),
            width = Math.abs(ptarget.x - center.x),
            height = Math.abs(ptarget.y - center.y);
        const gridExtent = new maptalks.PointExtent(
            center.x - gridX[0] * width,
            center.y - gridY[0] * height,
            center.x + gridX[1] * width,
            center.y + gridY[1] * height
        );
        const intersection = extent.intersection(gridExtent);
        if (!intersection) {
            return null;
        }
        const delta = 1E-6;
        const cols = [
            -Math.ceil((center.x - intersection.xmin - delta) / width),
            Math.ceil((intersection.xmax - center.x - delta) / width)
        ];
        const rows = [
            -Math.ceil((center.y - intersection.ymin - delta) / height),
            Math.ceil((intersection.ymax - center.y - delta) / height)
        ];
        return {
            cols : cols,
            rows : rows,
            width : width,
            height : height,
            center : center
        };
    }

    _getCellNW(col, row, gridInfo) {
        const map = this.getMap(),
            grid = this.layer.getGrid();
        if (grid['projection']) {
            const p = new maptalks.Point(
                gridInfo.center.x + (col > 0 ? col - 1 : col) * gridInfo.width,
                gridInfo.center.y + (row > 0 ? row - 1 : row) * gridInfo.height
            );
            return map._pointToContainerPoint(p);
        }
        return null;
    }

    _getCellCenter(col, row, gridInfo) {
        const grid = this.layer.getGrid();
        if (grid['projection']) {
            return [
                gridInfo.center.x + ((col > 0 ? col - 1 : col) + 1 / 2) * gridInfo.width,
                gridInfo.center.y + ((row > 0 ? row - 1 : row) + 1 / 2) * gridInfo.height
            ];
        }
        return null;
    }

    _drawData() {
        const grid = this.layer.getGrid(),
            gridInfo = grid['projection'] ? this._getProjGridToDraw() : this._getGridToDraw(),
            data = grid['data'];
        if (!Array.isArray(data) || !data.length) {
            return;
        }
        if (!this._gridSymbolTests) {
            this._gridSymbolTests = [];
        }
        data.forEach((gridData, index) => {
            if (!gridData[2]['symbol']) {
                return;
            }
            this._drawDataGrid(gridData, this._compiledSymbols[index], gridInfo);
            if (maptalks.Util.isNil(this._gridSymbolTests[index])) {
                this._gridSymbolTests[index] = this._testSymbol(gridData[2]['symbol']);
            }
            if (this._gridSymbolTests[index]) {
                this._drawDataCenter(gridData, index, gridInfo);
            }
        });
    }

    _drawDataGrid(gridData, symbol, gridInfo) {
        const ctx = this.context,
            map = this.getMap(),
            mapExtent = map.getContainerExtent();
        let painted = false;
        const cols = Array.isArray(gridData[0]) ? gridData[0] : [gridData[0], gridData[0]],
            rows = Array.isArray(gridData[1]) ? gridData[1] : [gridData[1], gridData[1]],
            p0 = this._getCellNW(cols[0], rows[0], gridInfo);
        let p1, p2, p3, p4, gridExtent;
        for (let i = cols[0]; i <= cols[1]; i++) {
            for (let ii = rows[0]; ii <= rows[1]; ii++) {
                p1 = this._getCellNW(i, ii, gridInfo);
                p2 = this._getCellNW(i + 1, ii, gridInfo);
                p3 = this._getCellNW(i + 1, ii + 1, gridInfo);
                p4 = this._getCellNW(i, ii + 1, gridInfo);
                gridExtent = new maptalks.PointExtent(p1.x, p1.y, p3.x, p3.y);
                // marker as an invalid grid if width or height is abnormally large.
                if (gridExtent.getWidth() > 1E4 || gridExtent.getHeight() > 1E4 || !mapExtent.intersects(gridExtent)) {
                    continue;
                }
                if (!painted) {
                    painted = true;
                    this._setCanvasStyle(symbol);
                    this.context.beginPath();
                }
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.lineTo(p4.x, p4.y);
                ctx.closePath();
            }
        }
        if (painted) {
            maptalks.Canvas.fillCanvas(this.context, symbol['polygonOpacity'], p0.x, p0.y);
        }
    }

    _testSymbol(symbol) {
        for (let i = symbolizers.length - 1; i >= 0; i--) {
            if (symbolizers[i].test(symbol)) {
                return true;
            }
        }
        return false;
    }

    _forceRenderOnMovingDataCenter(gridData, index, gridInfo) {
        const symbol = gridData[2]['symbol'];
        const map = this.getMap(),
            extent = map.getExtent();
        let dataMarkers = this._dataMarkers;
        if (!dataMarkers) {
            this._dataMarkers = dataMarkers = [];
        }
        const coordinates = [];
        const cols = Array.isArray(gridData[0]) ? gridData[0] : [gridData[0], gridData[0]],
            rows = Array.isArray(gridData[1]) ? gridData[1] : [gridData[1], gridData[1]];
        let p, c;
        for (let i = cols[0]; i <= cols[1]; i++) {
            for (let ii = rows[0]; ii <= rows[1]; ii++) {
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
        let line = dataMarkers[index];
        if (!line) {
            const lineSymbol = maptalks.Util.extend({}, symbol);
            lineSymbol['markerPlacement'] = 'point';
            lineSymbol['textPlacement'] = 'point';
            lineSymbol['lineOpacity'] = 0;
            lineSymbol['polygonOpacity'] = 0;
            line = new maptalks.LineString(coordinates, {
                'symbol' : lineSymbol,
                'properties' : gridData[2]['properties'],
                'debug' : this.layer.options['debug']
            });
            line._bindLayer(this.layer);
            dataMarkers[index] = line;
        } else {
            line.setCoordinates(coordinates);
        }
        line._getPainter().paint();
    }

    _setCanvasStyle(symbol) {
        const s = maptalks.Util.extend({}, defaultSymbol, symbol);
        maptalks.Canvas.prepareCanvas(this.context, s, this._resources);
    }

    onRemove() {
        delete this._compiledGridStyle;
        delete this._compiledSymbols;
        delete this._gridSymbolTests;
        delete this._dataMarkers;
    }
});



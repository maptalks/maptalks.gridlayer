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
export class GridLayer extends maptalks.Layer {

    constructor(id, grid, options) {
        super(id, options);
        if (!grid['unit']) {
            grid['unit'] = 'projection';
        }
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

    setGridData(data) {
        this._grid.data = data;
        return this.redraw();
    }

    redraw() {
        const renderer = this._getRenderer();
        if (!renderer) {
            return this;
        }
        renderer.redraw();
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

    getGridProjection() {
        if (this.options['projectionName']) {
            return maptalks.projection[this.options['projectionName'].toUpperCase()];
        } else {
            return this.getMap().getProjection();
        }
    }

    /**
     * Get grid's geographic exteng
     * @return {Extent}
     */
    getGridExtent() {
        const grid = this.getGrid(),
            center = new maptalks.Coordinate(grid.center),
            map = this.getMap(),
            w = grid.width,
            h = grid.height,
            cols = grid.cols || [-Infinity, Infinity],
            rows = grid.rows || [-Infinity, Infinity];
        if (grid['unit'] === 'projection') {
            // meters in projected coordinate system
            const projection = this.getGridProjection(),
                pcenter = projection.project(center);
            const xmin = pcenter.x + cols[0] * w,
                xmax = pcenter.x + cols[1] * w,
                ymin = pcenter.y + cols[0] * h,
                ymax = pcenter.y + cols[1] * h;
            return new maptalks.Extent(xmin, ymin, xmax, ymax).convertTo(c => projection.unproject(c));
        } else if (grid['unit'] === 'meter') {
            // distance in geographic meters
            const sw = map.locate(center, -w * cols[0], -h * rows[0]),
                ne = map.locate(center, w * cols[1], h * rows[1]);
            return new maptalks.Extent(sw, ne);
        } else if (grid['unit'] === 'degree') {
            const sw = center.add(w * cols[0], h * rows[0]),
                ne = center.add(w * cols[1], h * rows[1]);
            return new maptalks.Extent(sw, ne);
        }
        return null;
    }

    /**
     * Get cell index at coordinate
     * @param  {Coordinate} coordinate
     * @return {Object}
     * @private
     */
    getCellAt(coordinate) {
        const grid = this.getGrid(),
            map = this.getMap(),
            extent = this.getGridExtent();
        if (!extent.contains(coordinate)) {
            return null;
        }
        const gridCenter = new maptalks.Coordinate(grid.center);
        if (grid['unit'] === 'projection') {
            const center = map.coordinateToPoint(gridCenter),
                size = getCellPointSize(this, grid);
            const p = map.coordinateToPoint(coordinate),
                col = Math.floor((p.x - center.x) / size[0]),
                row = Math.floor((p.y - center.y) / size[0]);
            return [col, row];
        } else if (grid['unit'] === 'meter') {
            const distX = map.computeLength(new maptalks.Coordinate(coordinate.x, gridCenter.y), gridCenter),
                col = Math.floor(distX / grid.width);
            const distY = map.computeLength(new maptalks.Coordinate(gridCenter.x, coordinate.y), gridCenter),
                row = Math.floor(distY / grid.height);
            return [col, row];
        } else if (grid['unit'] === 'degree') {
            const distX = coordinate.x - gridCenter.x,
                col = Math.floor(distX / grid.width);
            const distY = coordinate.y - gridCenter.y,
                row = Math.floor(distY / grid.height);
            return [col, row];
        }
        return null;
    }

    getCellGeometry(col, row) {
        const map = this.getMap(),
            grid = this.getGrid();
        const gridCenter = new maptalks.Coordinate(grid.center);
        if (grid['unit'] === 'projection') {
            const center = map.coordinateToPoint(gridCenter),
                size = getCellPointSize(this, grid),
                width = size[0],
                height = size[1];
            const cnw = center.add(width * col, height * row);
            const nw = map.pointToCoordinate(cnw),
                ne = map.pointToCoordinate(cnw.add(width, 0)),
                sw = map.pointToCoordinate(cnw.add(0, height));
            const w = map.computeLength(nw, ne),
                h = map.computeLength(nw, sw);
            return new maptalks.Rectangle(nw, w, h);
        } else if (grid['unit'] === 'meter') {
            return null;
        } else if (grid['unit'] === 'degree') {
            return gridCenter.add(grid.width * col, grid.height * row);
        }
        return null;
    }

    /**
     * 变形虫
     * @param  {Rect} startCell 开始网格
     * @return {Array}  结果网格数组
     */
    visitAround(coordinate, cb) {
        const grid = this.getGrid(),
            gridData = grid.data;
        if (!coordinate || !grid.data || !cb) {
            return;
        }
        const data = [];
        for (let i = 0; i < gridData.length; i++) {
            let cols = gridData[i][0],
                rows = gridData[i][1];
            const value = gridData[i][2];
            if (!Array.isArray(cols)) {
                cols = [cols, cols];
            }
            if (!Array.isArray(rows)) {
                rows = [rows, rows];
            }
            for (let ii = cols[0]; ii <= cols[1]; ii++) {
                for (let iii = rows[0]; iii <= rows[1]; iii++) {
                    data.push([ii, iii, value]);
                }
            }
        }
        if (!data.length) {
            return;
        }

        const startCell = this.getCellAt(coordinate);
        //根据与开始网格的距离对所有网格排序
        const sorted = data.sort((a, b) => {
            return Math.pow((a[0] - startCell[0]), 2) + Math.pow((a[1] - startCell[1]), 2) - Math.pow((b[0] - startCell[0]), 2) - Math.pow((b[1] - startCell[1]), 2);
        });

        for (let i = 0, l = sorted.length; i < l; i++) {
            if (cb(sorted[i]) === false) {
                break;
            }
        }
    }

    identify(coordinate) {
        if (!coordinate) {
            return null;
        }
        const extent = this.getGridExtent();
        if (!extent.contains(coordinate)) {
            return null;
        }
        const idx = this.getCellAt(coordinate);
        const rectangle = this.getCellGeometry(idx[0], idx[1]);
        return {
            col : idx[0],
            row : idx[1],
            geometry : rectangle
        };
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

    needToRedraw() {
        const map = this.getMap();
        if (!map.getPitch() && map.isZooming()) {
            return false;
        }
        return super.needToRedraw();
    }

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
        this.setToRedraw();
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
            gridInfo = grid['unit'] === 'projection' ? this._getProjGridToDraw() : this._getGridToDraw();
        if (!gridInfo || this._compiledGridStyle.lineOpacity <= 0 || this._compiledGridStyle.lineWidth <= 0) {
            return;
        }
        const cols = gridInfo.cols,
            rows = gridInfo.rows,
            width = gridInfo.width,
            height = gridInfo.height,
            p0 = this._getCellNW(cols[0], rows[0], gridInfo);
        let p1, p2;
        this.context.beginPath();
        if (width < 0.5 || height < 0.5 || (this._compiledGridStyle['polygonOpacity'] > 0 || this._compiledGridStyle['polygonColor'] || this._compiledGridStyle['polygonPatternFile'])) {
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
        for (let i = cols[0]; i <= cols[1]; i++) {
            p1 = this._getCellNW(i, rows[0], gridInfo);
            p2 = this._getCellNW(i, rows[1], gridInfo);
            this.context.moveTo(p1.x, p1.y);
            this.context.lineTo(p2.x, p2.y);
        }
        for (let i = rows[0]; i <= rows[1]; i++) {
            p1 = this._getCellNW(cols[0], i, gridInfo);
            p2 = this._getCellNW(cols[1], i, gridInfo);
            this.context.moveTo(p1.x, p1.y);
            this.context.lineTo(p2.x, p2.y);
        }
        maptalks.Canvas._stroke(this.context, this._compiledGridStyle['lineOpacity'], p0.x, p0.y);
    }

    _getProjGridToDraw() {
        const grid = this.layer.getGrid(),
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
        const gridExtent = new maptalks.PointExtent(
            center.x + gridX[0] * width,
            center.y + gridY[0] * height,
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
            width : Math.round(width),
            height : Math.round(height),
            center : center
        };
    }

    _getGridToDraw() {
        const grid = this.layer.getGrid(),
            map = this.getMap(),
            // projection = map.getProjection(),
            extent = map.getExtent(),
            gridCenter = new maptalks.Coordinate(grid.center),
            gridExtent = this.layer.getGridExtent(),
            w = grid.width,
            h = grid.height;

        const intersection = extent.intersection(gridExtent);
        if (!intersection) {
            return null;
        }
        const delta = 1E-6;
        let cols, rows;
        if (grid['unit'] === 'meter') {
            const dx1 = map.computeLength(new maptalks.Coordinate(intersection.xmin, gridCenter.y), gridCenter),
                dx2 = map.computeLength(new maptalks.Coordinate(intersection.xmax, gridCenter.y), gridCenter);
            const dy1 = map.computeLength(new maptalks.Coordinate(gridCenter.y, intersection.ymin), gridCenter),
                dy2 = map.computeLength(new maptalks.Coordinate(intersection.ymax, gridCenter.y), gridCenter);
            cols = [
                -Math.ceil(dx1 / grid.width),
                Math.ceil(dx2 / grid.width)
            ];
            rows = [
                -Math.ceil(dy1 / grid.height),
                Math.ceil(dy2 / grid.height)
            ];
        } else if (grid['unit'] === 'degree') {
            cols = [
                -Math.ceil((gridCenter.x - intersection.xmin - delta) / w),
                Math.ceil((intersection.xmax - gridCenter.x - delta) / w)
            ];
            rows = [
                -Math.ceil((gridCenter.y - intersection.ymin - delta) / h),
                Math.ceil((intersection.ymax - gridCenter.y - delta) / h)
            ];
        }

        return {
            cols : cols,
            rows : rows,
            center : gridCenter
        };
    }

    _getCellNW(col, row, gridInfo) {
        const map = this.getMap(),
            grid = this.layer.getGrid();
        if (grid['unit'] === 'projection') {
            const p = new maptalks.Point(
                gridInfo.center.x + col * gridInfo.width,
                gridInfo.center.y + row * gridInfo.height
            );
            return map._pointToContainerPoint(p)._floor();
        } else if (grid['unit'] === 'meter') {
            const center = new maptalks.Coordinate(grid.center);
            const target = map.locate(center, grid.width * col, grid.height * row);
            return map.coordinateToContainerPoint(target)._floor();
        } else if (grid['unit'] === 'degree') {
            const center = new maptalks.Coordinate(grid.center);
            const target = center.add(col * grid.width, row * grid.height);
            return map.coordinateToContainerPoint(target)._floor();
        }
        return null;
    }

    _getCellCenter(col, row, gridInfo) {
        const grid = this.layer.getGrid(),
            map = this.getMap();
        if (grid['unit'] === 'projection') {
            const p = new maptalks.Point(
                gridInfo.center.x + (col + 1 / 2) * gridInfo.width,
                gridInfo.center.y + (row + 1 / 2) * gridInfo.height
            );
            return map.pointToCoordinate(p);
        } else if (grid['unit'] === 'meter') {
            const center = new maptalks.Coordinate(grid.center);
            return  map.locate(center, grid.width * (col + 1 / 2), grid.height * (row + 1 / 2));
        } else if (grid['unit'] === 'degree') {
            const center = new maptalks.Coordinate(grid.center);
            return center.add(grid.width * (col + 1 / 2), grid.height * (row + 1 / 2));
        }
        return null;
    }

    _drawData() {
        const grid = this.layer.getGrid(),
            gridInfo = grid['unit'] === 'projection' ? this._getProjGridToDraw() : this._getGridToDraw(),
            data = grid['data'];
        if (!gridInfo || !Array.isArray(data) || !data.length) {
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
    }

    _testSymbol(symbol) {
        for (let i = symbolizers.length - 1; i >= 0; i--) {
            if (symbolizers[i].test(symbol)) {
                return true;
            }
        }
        return false;
    }

    _drawDataCenter(gridData, index, gridInfo) {
        const symbol = gridData[2]['symbol'];
        const map = this.getMap(),
            extent = map.getExtent();
        let dataMarkers = this._dataMarkers;
        if (!dataMarkers) {
            this._dataMarkers = dataMarkers = [];
        }
        const coordinates = [];
        if (!Array.isArray(gridData[0]) && !Array.isArray(gridData[1])) {
            const p = this._getCellCenter(gridData[0], gridData[1], gridInfo);
            if (extent.contains(p)) {
                coordinates.push(p);
            }
        } else {
            const cols = Array.isArray(gridData[0]) ? gridData[0] : [gridData[0], gridData[0]],
                rows = Array.isArray(gridData[1]) ? gridData[1] : [gridData[1], gridData[1]];
            for (let i = cols[0]; i <= cols[1]; i++) {
                for (let ii = rows[0]; ii <= rows[1]; ii++) {
                    const p = this._getCellCenter(i, ii, gridInfo);
                    if (extent.contains(p)) {
                        coordinates.push(p);
                    }
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


function getCellPointSize(layer, grid) {
    const projection = layer.getGridProjection(),
        map = layer.getMap(),
        gridCenter = new maptalks.Coordinate(grid.center),
        center = map.coordinateToPoint(gridCenter),
        target = projection.project(gridCenter)._add(grid.width, grid.height),
        ptarget = map._prjToPoint(target),
        width = Math.abs(ptarget.x - center.x),
        height = Math.abs(ptarget.y - center.y);
    return [width, height];
}

import * as maptalks from 'maptalks';
import { getCellPointSize, defaultSymbol } from '../common';

const symbolizers = [
    maptalks.symbolizer.ImageMarkerSymbolizer,
    maptalks.symbolizer.TextMarkerSymbolizer,
    maptalks.symbolizer.VectorMarkerSymbolizer,
    maptalks.symbolizer.VectorPathMarkerSymbolizer
];

export default class GridCanvasRenderer extends maptalks.renderer.CanvasRenderer {

    needToRedraw() {
        const map = this.getMap();
        if (!map.getPitch() && map.isZooming()) {
            return false;
        }
        return super.needToRedraw();
    }

    draw() {
        const grid = this.layer.getGrid(0);
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
            for (let i = 0; i < this._compiledSymbols.length; i++) {
                const gridSymbols = this._compiledSymbols[i];
                for (let ii = 0; ii < gridSymbols.length; ii++) {
                    const c = maptalks.Util.getExternalResources(gridSymbols[ii]);
                    if (c) {
                        resources = resources.concat(c);
                    }
                }
            }
        }
        return resources;
    }

    redraw() {
        this.reset();
        this.setToRedraw();
    }

    reset() {
        delete this._compiledSymbols;
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
                gridCount = this.layer.getGridCount();
            this._compiledSymbols = [];
            for (let i = 0; i < gridCount; i++) {
                const grid = this.layer.getGrid(i),
                    data = grid['data'];
                this._compiledSymbols[i] = [];
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
                        this._compiledSymbols[i][index] = maptalks.MapboxUtil.loadFunctionTypes(s, argFn);
                    });
                }
            }

        }
    }

    _preDrawGrid() {
        const map = this.getMap();
        const count = this.layer.getGridCount();
        const gridInfos = [];
        for (let i = 0; i < count; i++) {
            const grid = this.layer.getGrid(i),
                gridInfo = grid['unit'] === 'projection' ? this._getProjGridToDraw(grid, i) : this._getGridToDraw(grid, i);
            if (!gridInfo || this._compiledGridStyle.lineOpacity <= 0 || this._compiledGridStyle.lineWidth <= 0) {
                gridInfos.push(null);
                continue;
            }
            const cols = gridInfo.cols,
                rows = gridInfo.rows;
            const p0 = this._getCellNW(cols[0], rows[0], gridInfo);
            if (map.getPitch() === 0) {
                const p1 = this._getCellNW(cols[0] + 1, rows[0] + 1, gridInfo);
                const width = Math.abs(p0.x - p1.x);
                const height = Math.abs(p0.y - p1.y);
                if (width < 0.5 || height < 0.5 || (this._compiledGridStyle['polygonOpacity'] > 0 || this._compiledGridStyle['polygonColor'] || this._compiledGridStyle['polygonPatternFile'])) {
                    const p2 = this._getCellNW(cols[1] + 1, rows[0], gridInfo);
                    const p3 = this._getCellNW(cols[1] + 1, rows[1] + 1, gridInfo);
                    const p4 = this._getCellNW(cols[0], rows[1] + 1, gridInfo);
                    this.context.beginPath();
                    // this.context.rect(p0.x, p0.y, p2.x - p0.x, p2.y - p0.y);
                    this.context.moveTo(p0.x, p0.y);
                    this.context.lineTo(p2.x, p2.y);
                    this.context.lineTo(p3.x, p3.y);
                    this.context.lineTo(p4.x, p4.y);
                    this.context.closePath();

                    this.context.fillStyle = this._compiledGridStyle.lineColor;
                    if (this._compiledGridStyle['polygonOpacity'] > 0) {
                        maptalks.Canvas.fillCanvas(this.context, this._compiledGridStyle['polygonOpacity'], p0.x, p0.y);
                    } else {
                        maptalks.Canvas.fillCanvas(this.context, 1, p0.x, p0.y);
                    }
                    if (width < 0.5 || height < 0.5) {
                        gridInfos.push(null);
                        continue;
                    }
                }
            }
            gridInfos.push({
                cols : cols,
                rows : rows,
                gridInfo : gridInfo,
                p0 : p0
            });
        }
        return gridInfos;
    }

    _drawGrid() {
        const colRows = this._preDrawGrid();
        for (let i = 0; i < colRows.length; i++) {
            const colRow = colRows[i];
            if (!colRow) {
                continue;
            }
            this.context.beginPath();
            const cols = colRow['cols'],
                rows = colRow['rows'],
                gridInfo = colRow['gridInfo'],
                p0 = colRow['p0'];
            let p1, p2;
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

    }

    _getProjGridToDraw(grid) {
        const map = this.getMap(),
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
            width : width,
            height : height,
            center : center,
            unit : grid.unit
        };
    }

    _getGridToDraw(grid, index) {
        const map = this.getMap(),
            // projection = map.getProjection(),
            extent = map.getExtent(),
            gridCenter = new maptalks.Coordinate(grid.center),
            gridExtent = this.layer.getGridExtent(index),
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
            center : gridCenter,
            unit : grid.unit,
            width : grid.width,
            height : grid.height
        };
    }

    _getCellNWPoint(col, row, gridInfo, targetZ) {
        const map = this.getMap();
        if (gridInfo['unit'] === 'projection') {
            const p = new maptalks.Point(
                gridInfo.center.x + col * gridInfo.width,
                gridInfo.center.y + row * gridInfo.height
            );
            return map._pointToPointAtZoom(p, targetZ);
        } else if (gridInfo['unit'] === 'meter') {
            const center = gridInfo.center;
            const target = map.locate(center, gridInfo.width * col, gridInfo.height * row);
            return map.coordToPoint(target, targetZ);
        } else if (gridInfo['unit'] === 'degree') {
            const center = gridInfo.center;
            const target = center.add(col * gridInfo.width, row * gridInfo.height);
            return map.coordToPoint(target, targetZ);
        }
        return null;
    }

    _getCellNW(col, row, gridInfo) {
        const point = this._getCellNWPoint(col, row, gridInfo);
        return this.getMap()._pointToContainerPoint(point);
    }

    _getCellCenter(col, row, gridInfo) {
        const map = this.getMap();
        if (gridInfo['unit'] === 'projection') {
            const p = new maptalks.Point(
                gridInfo.center.x + (col + 1 / 2) * gridInfo.width,
                gridInfo.center.y + (row + 1 / 2) * gridInfo.height
            );
            return map.pointToCoordinate(p);
        } else if (gridInfo['unit'] === 'meter') {
            const center = gridInfo.center;
            return map.locate(center, gridInfo.width * (col + 1 / 2), gridInfo.height * (row + 1 / 2));
        } else if (gridInfo['unit'] === 'degree') {
            const center = gridInfo.center;
            return center.add(gridInfo.width * (col + 1 / 2), gridInfo.height * (row + 1 / 2));
        }
        return null;
    }

    _drawData() {
        const count = this.layer.getGridCount();
        for (let i = 0; i < count; i++) {
            const grid = this.layer.getGrid(i),
                gridInfo = grid['unit'] === 'projection' ? this._getProjGridToDraw(grid, i) : this._getGridToDraw(grid, i),
                data = grid['data'];
            if (!Array.isArray(data) || !data.length) {
                return;
            }
            data.forEach((gridData, index) => {
                if (!gridData[2]['symbol'] || !gridInfo) {
                    return;
                }
                this._drawDataGrid(gridData, this._compiledSymbols[i][index], gridInfo);
                this._drawLabel(gridData, index, gridInfo);
            });
        }

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

    _drawLabel(gridData, index, gridInfo) {
        if (!this._gridSymbolTests) {
            this._gridSymbolTests = [];
        }
        if (maptalks.Util.isNil(this._gridSymbolTests[index])) {
            this._gridSymbolTests[index] = this._testSymbol(gridData[2]['symbol']);
        }
        if (!this._gridSymbolTests[index]) {
            return;
        }
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
            const redraw = this._toRedraw;
            line.setCoordinates(coordinates);
            this._toRedraw = redraw;
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
}

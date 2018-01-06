import { getCellPointSize, defaultSymbol } from './common';

import * as maptalks from 'maptalks';

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
            let xmin = pcenter.x + cols[0] * w,
                xmax = pcenter.x + cols[1] * w,
                ymin = pcenter.y + cols[0] * h,
                ymax = pcenter.y + cols[1] * h;
            const fullExtent = map.getFullExtent();
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

    /**
     * Get cell's geometry
     * @param {Number} col cell col
     * @param {Number} row cell row
     * @returns {maptalks.Geometry}
     */
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
     * Visit data cells around given coordinate
     * @param  {maptalks.Coordinate} coordinate
     * @param {Function}  cb  callback function, parameter is [col, row, { properties, symbol }], return false to break the visiting
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
        if (!startCell) {
            return;
        }
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

    /**
     * Return cell index and cell geometry at coordinate
     * @param {maptalks.Coordinate} coordinate coordinate
     * @returns {Object} { col : col, row : row, geometry : cellGeometry }
     */
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

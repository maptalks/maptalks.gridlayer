export function getCellPointSize(layer, grid) {
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


export const defaultSymbol = {
    'lineColor' : '#bbb',
    'lineWidth' : 1,
    'lineOpacity' : 1,
    'lineDasharray': [],
    'lineCap' : 'butt',
    'lineJoin' : 'round',
    'polygonOpacity' : 0
};

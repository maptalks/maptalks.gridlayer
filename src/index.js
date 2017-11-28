// import * as maptalks from 'maptalks';
import { GridLayer } from './gridlayer';
import GridCanvasRenderer from './renderer/canvas-renderer';
import GridGLRenderer from './renderer/gl-renderer';

GridLayer.registerRenderer('canvas', GridCanvasRenderer);
GridLayer.registerRenderer('gl', GridGLRenderer);

GridLayer.mergeOptions({
    'renderer' : (() => {
        return maptalks.Browser.webgl ? 'gl' : 'canvas';
    })()
});

export { GridLayer };

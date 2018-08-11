import { GridLayer } from './gridlayer';
import GridCanvasRenderer from './renderer/canvas-renderer';
import GridGLRenderer from './renderer/gl-renderer';

GridLayer.registerRenderer('canvas', GridCanvasRenderer);
GridLayer.registerRenderer('gl', GridGLRenderer);

GridLayer.mergeOptions({
    'renderer' : 'gl'
});

export { GridLayer };

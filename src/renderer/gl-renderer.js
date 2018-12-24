import GridCanvasRenderer from './canvas-renderer';
import * as maptalks from 'maptalks';
import Color from 'color';

const shaders = {
    'vertexShader' : `
        precision mediump float;

        attribute vec3 a_position;

        uniform mat4 u_matrix;

        void main() {
            gl_Position = u_matrix * vec4(a_position, 1.0);
        }
    `,
    // fragment shader, can be replaced by layer.options.fragmentShader
    'fragmentShader' : `
        precision mediump float;

        uniform float u_opacity;

        uniform vec4 u_color;

        void main() {
            gl_FragColor = u_color * u_opacity;
        }
    `
};

const dataGridShaders = {
    'vertexShader' : `
        precision mediump float;

        attribute vec3 a_position;
        attribute vec3 a_color;
        attribute float a_opacity;

        varying vec4 v_color;

        uniform mat4 u_matrix;

        void main() {
            v_color = vec4(a_color / 255.0, 1.0) * (a_opacity / 255.0);
            gl_Position = u_matrix * vec4(a_position, 1.0);
        }
    `,
    // fragment shader, can be replaced by layer.options.fragmentShader
    'fragmentShader' : `
        precision mediump float;

        varying vec4 v_color;

        void main() {
            vec4 color = v_color;
            // color = vec4(0.0, 0.0, 0.0, 1.0);
            gl_FragColor = color;
        }
    `
};

export default class GridGLRenderer extends GridCanvasRenderer {

    draw() {
        const grid = this.layer.getGrid();
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
    }

    drawOnInteracting() {
        this.draw();
    }

    redraw() {
        this.setToRedraw();
    }

    _meterToPoint(center, altitude) {
        const map = this.getMap();
        const z = map.getGLZoom();
        const target = map.locate(center, altitude, 0);
        const p0 = map.coordToPoint(center, z),
            p1 = map.coordToPoint(target, z);
        return Math.abs(p1.x - p0.x) * maptalks.Util.sign(altitude);
    }

    _updateUniforms() {
        const gl = this.gl;
        gl.uniformMatrix4fv(this.program['u_matrix'], false, this.copy16(this.getMap().projViewMatrix));
    }

    _useGridProgram() {
        if (!this.gridProgram) {
            this.gridProgram = this.createProgram(shaders['vertexShader'], shaders['fragmentShader'], ['u_matrix', 'u_color', 'u_opacity']);
        }
        this.useProgram(this.gridProgram);
        this.program = this.gridProgram;
    }

    _drawGrid() {
        const colRow = this._preDrawGrid();
        if (!colRow) {
            return;
        }

        const cols = colRow['cols'],
            rows = colRow['rows'],
            gridInfo = colRow['gridInfo'];
        let p1, p2;
        const map = this.getMap(),
            zoom = map.getGLZoom(),
            altitude = this.layer.options['altitude'];
        let z = 0;
        if (altitude) {
            z = this._meterToPoint(map.getCenter(), altitude);
        }

        const count = (cols[1] - cols[0] + 1) * 6 + (rows[1] - rows[0] + 1) * 6;
        const vertices = new Float32Array(count);
        let c = 0;
        const set = p => {
            vertices[c++] = p;
        };
        //划线
        for (let i = cols[0]; i <= cols[1]; i++) {
            p1 = this._getCellNWPoint(i, rows[0], gridInfo, zoom);
            p2 = this._getCellNWPoint(i, rows[1], gridInfo, zoom);
            [p1.x, p1.y, z, p2.x, p2.y, z].forEach(set);
        }
        for (let i = rows[0]; i <= rows[1]; i++) {
            p1 = this._getCellNWPoint(cols[0], i, gridInfo, zoom);
            p2 = this._getCellNWPoint(cols[1], i, gridInfo, zoom);
            [p1.x, p1.y, z, p2.x, p2.y, z].forEach(set);
        }

        if (!this.gridBuffer) {
            this.gridBuffer = this.createBuffer();
        }
        const gl = this.gl;
        gl.lineWidth(this._compiledGridStyle.lineWidth || 1);

        this._useGridProgram();
        this._updateUniforms();

        gl.uniform1f(this.program['u_opacity'], this._compiledGridStyle.lineOpacity || 1);
        const color = Color(this._compiledGridStyle.lineColor || '#000').rgbaArrayNormalized();
        gl.uniform4fv(this.program['u_color'], color || [0, 0, 0, 1]);


        gl.bindBuffer(gl.ARRAY_BUFFER, this.gridBuffer);
        this.enableVertexAttrib(['a_position', 3]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.LINES, 0, vertices.length / 3);
        gl.lineWidth(1);
    }

    _useDataGridProgram() {
        if (!this.dataGridProgram) {
            this.dataGridProgram = this.createProgram(dataGridShaders['vertexShader'], dataGridShaders['fragmentShader'], ['u_matrix']);
        }
        this.useProgram(this.dataGridProgram);
        this.program = this.dataGridProgram;
    }

    _glDrawDataGrid() {
        const grid = this.layer.getGrid(),
            gridInfo = grid['unit'] === 'projection' ? this._getProjGridToDraw() : this._getGridToDraw(),
            data = grid['data'];
        if (!gridInfo || !Array.isArray(data) || !data.length) {
            return;
        }

        const isDynamic = maptalks.Util.isFunction(grid.offset);
        const vertices = [], colors = [];
        const indices = [];
        if (!this.paintedGridNum || isDynamic) {
            let c = 0;
            data.forEach((gridData, index) => {
                if (!gridData[2]['symbol']) {
                    return;
                }
                c = this._drawDataGrid({ vertices, colors, indices }, c, gridData, this._compiledSymbols[index], gridInfo);
            });
        }

        if (!this.dataGridBuffer) {
            this.dataGridBuffer = this.createBuffer();
            this.dataGridIndexBuffer = this.createBuffer();
            this.dataColorsBuffer = this.createBuffer();
        }
        const gl = this.gl;

        this._useDataGridProgram();
        this._updateUniforms();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.dataColorsBuffer);
        this.enableVertexAttrib([['a_color', 3, 'UNSIGNED_BYTE'], ['a_opacity', 1, 'UNSIGNED_BYTE']]);
        if (colors.length > 0) {
            gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colors), isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.dataGridBuffer);
        this.enableVertexAttrib([['a_position', 3]]);
        if (vertices.length > 0) {
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        }

        // Write the indices to the buffer object
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.dataGridIndexBuffer);
        if (indices.length > 0) {
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
            this.paintedGridNum = indices.length;
        }
        gl.drawElements(gl.TRIANGLES, this.paintedGridNum, gl.UNSIGNED_INT, 0);
    }

    _drawDataGrid({ vertices, indices, colors }, c, gridData, symbol, gridInfo) {
        const map = this.getMap(),
            zoom = map.getGLZoom();
        const cols = Array.isArray(gridData[0]) ? gridData[0] : [gridData[0], gridData[0]],
            rows = Array.isArray(gridData[1]) ? gridData[1] : [gridData[1], gridData[1]],
            altitude = this.layer.options['altitude'];
        let z = 0;
        if (altitude) {
            z = this._meterToPoint(map.getCenter(), altitude);
        }

        const set = p => {
            // vertices[c++] = p;
            vertices.push(p);
            c++;
        };

        const setColor = p => {
            colors.push(p);
        };

        let color = symbol['polygonFill'];
        let opacity = symbol['polygonOpacity'] === undefined ? 1 : symbol['polygonOpacity'];
        if (!color) {
            color = '#fff';
            opacity = 0;
        }

        const style = Color(color).rgbaArray();
        style[3] *= opacity * 255;

        let p1, p2, p3, p4;
        for (let i = cols[0]; i <= cols[1]; i++) {
            for (let ii = rows[0]; ii <= rows[1]; ii++) {
                p1 = this._getCellNWPoint(i, ii, gridInfo, zoom);
                p3 = this._getCellNWPoint(i + 1, ii + 1, gridInfo, zoom);
                p2 = p1.add(p3.x - p1.x, 0);
                // p3 = p1.add(w, h);
                p4 = p1.add(0, p3.y - p1.y);
                const idx = c / 3;
                indices.push(idx, idx + 1, idx + 2);
                indices.push(idx, idx + 2, idx + 3);
                [p1.x, p1.y, z].forEach(set);
                style.forEach(setColor);
                [p2.x, p2.y, z].forEach(set);
                style.forEach(setColor);
                [p3.x, p3.y, z].forEach(set);
                style.forEach(setColor);
                [p4.x, p4.y, z].forEach(set);
                style.forEach(setColor);
            }
        }

        return c;
    }


    _drawAllLabels() {
        const grid = this.layer.getGrid(),
            gridInfo = grid['unit'] === 'projection' ? this._getProjGridToDraw() : this._getGridToDraw(),
            data = grid['data'];
        if (!gridInfo || !Array.isArray(data) || !data.length) {
            return;
        }
        data.forEach((gridData, index) => {
            this._drawLabel(gridData, index, gridInfo);
        });
    }

    onRemove() {
        super.onRemove();
        // release resources
        const gl = this.gl;
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
            this._textures.forEach(t => gl.deleteTexture(t));
            delete this._textures;
        }
        const program = gl.program;
        gl.deleteProgram(program);
        gl.deleteShader(program.fragmentShader);
        gl.deleteShader(program.vertexShader);
    }

    onCanvasCreate() {
        //create a canvas2 to draw grids with webgl
        //texts will be still drawn by (this.canvas + this.context)
        this.canvas2 = maptalks.Canvas.createCanvas(this.canvas.width, this.canvas.height);
        const gl = this.gl = this._createGLContext(this.canvas2, this.layer.options['glOptions']);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.getExtension('OES_element_index_uint');
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    resizeCanvas(canvasSize) {
        if (!this.canvas) {
            return;
        }
        super.resizeCanvas(canvasSize);
        if (this.canvas2.width !== this.canvas.width || this.canvas2.height !== this.canvas.height) {
            this.canvas2.width = this.canvas.width;
            this.canvas2.height = this.canvas.height;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    clearCanvas() {
        if (!this.canvas) {
            return;
        }
        super.clearCanvas();
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    _drawGlCanvas() {
        const ctx = this.context;
        if (maptalks.Browser.retina) {
            ctx.save();
            ctx.scale(1 / 2, 1 / 2);
        }
        // draw gl canvas on layer canvas
        ctx.drawImage(this.canvas2, 0, 0);
        if (maptalks.Browser.retina) {
            ctx.restore();
        }
    }

    //----------------------- webgl utils unlike to change ---------------------------------

    createBuffer() {
        const gl = this.gl;
        // Create the buffer object
        const buffer = gl.createBuffer();
        if (!buffer) {
            throw new Error('Failed to create the buffer object');
        }
        if (!this._buffers) {
            this._buffers = [];
        }
        this._buffers.push(buffer);
        return buffer;
    }

    /**
     *
     * @param {Array} attributes [[name, stride, type], [name, stride, type]...]
     */
    enableVertexAttrib(attributes) {
        const gl = this.gl;
        if (Array.isArray(attributes[0])) {
            let STRIDE = 0;
            for (let i = 0; i < attributes.length; i++) {
                STRIDE += (attributes[i][1] || 0);
            }
            let offset = 0;
            for (let i = 0; i < attributes.length; i++) {
                const attr = gl.getAttribLocation(gl.program, attributes[i][0]);
                if (attr < 0) {
                    throw new Error('Failed to get the storage location of ' + attributes[i][0]);
                }
                let FSIZE;
                if (!attributes[i][2] || attributes[i][2] === 'FLOAT') {
                    FSIZE = 4;
                } else if (attributes[i][2] === 'BYTE' || attributes[i][2] === 'UNSIGNED_BYTE') {
                    FSIZE = 1;
                } else {
                    FSIZE = 2;
                }
                gl.vertexAttribPointer(attr, attributes[i][1], gl[attributes[i][2] || 'FLOAT'], false, FSIZE * STRIDE, FSIZE * offset);
                offset += (attributes[i][1] || 0);
                gl.enableVertexAttribArray(attr);
            }
        } else {
            const attr = gl.getAttribLocation(gl.program, attributes[0]);
            gl.vertexAttribPointer(attr, attributes[1], gl[attributes[2] || 'FLOAT'], false, 0, 0);
            gl.enableVertexAttribArray(attr);
        }
    }

    /**
     * Create the linked program object
     * @param vshader a vertex shader program (string)
     * @param fshader a fragment shader program (string)
     * @return created program object, or null if the creation has failed
     */
    createProgram(vshader, fshader, uniforms) {
        const gl = this.gl;
        // Create shader object
        const vertexShader = this._compileShader(gl, gl.VERTEX_SHADER, vshader);
        const fragmentShader = this._compileShader(gl, gl.FRAGMENT_SHADER, fshader);
        if (!vertexShader || !fragmentShader) {
            return null;
        }

        // Create a program object
        const program = gl.createProgram();
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
        const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!linked) {
            const error = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            gl.deleteShader(fragmentShader);
            gl.deleteShader(vertexShader);
            throw new Error('Failed to link program: ' + error);
        }

        this._initUniforms(program, uniforms);

        return program;
    }

    useProgram(program) {
        const gl = this.gl;
        gl.useProgram(program);
        gl.program = program;
        return this;
    }

    enableSampler(sampler, texIdx) {
        const gl = this.gl;
        const uSampler = this._getUniform(gl.program, sampler);
        if (!texIdx) {
            texIdx = 0;
        }
        // Set the texture unit to the sampler
        gl.uniform1i(uSampler, texIdx);
        return uSampler;
    }

    _createGLContext(canvas) {
        const attributes = {
            'alpha': true
        };
        const names = ['webgl', 'experimental-webgl'];
        let context = null;
        /* eslint-disable no-empty */
        for (let i = 0; i < names.length; ++i) {
            try {
                context = canvas.getContext(names[i], attributes);
            } catch (e) {}
            if (context) {
                break;
            }
        }
        return context;
        /* eslint-enable no-empty */
    }

    /**
     * Create a shader object
     * @param gl GL context
     * @param type the type of the shader object to be created
     * @param source shader program (string)
     * @return created shader object, or null if the creation has failed.
     */
    _compileShader(gl, type, source) {
        // Create shader object
        const shader = gl.createShader(type);
        if (shader == null) {
            throw new Error('unable to create shader');
        }

        // Set the shader program
        gl.shaderSource(shader, source);
        // Compile the shader
        gl.compileShader(shader);

        // Check the result of compilation
        const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!compiled) {
            const error = gl.getShaderInfoLog(shader);

            gl.deleteShader(shader);
            throw new Error('Failed to compile shader: ' + error);
        }

        return shader;
    }

    _initUniforms(program, uniforms) {
        for (let i = 0; i < uniforms.length; i++) {
            let name = uniforms[i];
            let uniform = uniforms[i];
            const b = name.indexOf('[');
            if (b >= 0) {
                name = name.substring(0, b);
                uniform = uniform.substring(0, b);
            }
            program[name] = this._getUniform(program, uniform);
        }
    }

    _getUniform(program, uniformName) {
        const gl = this.gl;
        const uniform = gl.getUniformLocation(program, uniformName);
        if (!uniform) {
            throw new Error('Failed to get the storage location of ' + uniformName);
        }
        return uniform;
    }
}

GridGLRenderer.include({

    copy16: function () {
        const m = maptalks.Browser.ie9 ? null : new Float32Array(16);
        return function (arr) {
            for (let i = 0; i < 16; i++) {
                m[i] = arr[i];
            }
            return m;
        };
    }()
});

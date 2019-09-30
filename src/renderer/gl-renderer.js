import GridCanvasRenderer from './canvas-renderer';
import * as maptalks from 'maptalks';
import Color from 'color';

const shaders = {
    'vertexShader' : `
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

    reset() {
        super.reset();
        delete this.paintedGridNum;
        delete this._dataVertices;
        delete this._dataColors;
        delete this._dataIndices;
        if (this.gl) {
            if (this._buffers) {
                this._buffers.forEach(buffer => {
                    this.gl.deleteBuffer(buffer);
                });
            }
        }
        delete this.gridBuffer;
        delete this.dataGridBuffer;
        delete this.dataGridIndexBuffer;
        delete this.dataColorsBuffer;
        this._buffers = [];
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
        gl.uniformMatrix4fv(this.program['u_matrix'], false, this.getMap().projViewMatrix);
    }

    _useGridProgram() {
        if (!this.gridProgram) {
            this.gridProgram = this.createProgram(shaders['vertexShader'], shaders['fragmentShader'], ['u_matrix', 'u_color', 'u_opacity']);
        }
        this.useProgram(this.gridProgram);
        this.program = this.gridProgram;
    }

    _drawGrid() {
        if (!this.gridBuffer) {
            this.gridBuffer = [];
        }
        this._useGridProgram();
        const colRows = this._preDrawGrid();
        for (let i = 0; i < colRows.length; i++) {
            const colRow = colRows[i];
            if (!colRow) {
                continue;
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

            if (!this.gridBuffer[i]) {
                this.gridBuffer[i] = this.createBuffer();
            }
            const gl = this.gl;
            gl.lineWidth(this._compiledGridStyle.lineWidth || 1);

            this._updateUniforms();

            gl.uniform1f(this.program['u_opacity'], this._compiledGridStyle.lineOpacity || 1);
            const color = Color(this._compiledGridStyle.lineColor || '#000').rgbaArrayNormalized();
            gl.uniform4fv(this.program['u_color'], color || [0, 0, 0, 1]);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.gridBuffer[i]);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
            this.enableVertexAttrib(['a_position', 3]);
            gl.drawArrays(gl.LINES, 0, vertices.length / 3);
            gl.lineWidth(1);
        }
    }

    _useDataGridProgram() {
        if (!this.dataGridProgram) {
            this.dataGridProgram = this.createProgram(dataGridShaders['vertexShader'], dataGridShaders['fragmentShader'], ['u_matrix']);
        }
        this.useProgram(this.dataGridProgram);
        this.program = this.dataGridProgram;
    }

    _glDrawDataGrid() {
        if (!this.paintedGridNum) {
            this.paintedGridNum = [];
            this._dataVertices = [];
            this._dataColors = [];
            this._dataIndices = [];
            this.dataGridBuffer = [];
            this.dataGridIndexBuffer = [];
            this.dataColorsBuffer = [];
        }
        const gl = this.gl;
        this._useDataGridProgram();
        const count = this.layer.getGridCount();
        for (let i = 0; i < count; i++) {
            const grid = this.layer.getGrid(i),
                gridInfo = grid['unit'] === 'projection' ? this._getProjGridToDraw(grid, i) : this._getGridToDraw(grid, i),
                data = grid['data'];
            if (!gridInfo || !Array.isArray(data) || !data.length) {
                continue;
            }

            const isDynamic = maptalks.Util.isFunction(grid.offset);
            let vertices = this._dataVertices[i] || [], colors = this._dataColors[i] || [];
            let indices = this._dataIndices[i] || [];
            if (!this.paintedGridNum[i] || isDynamic) {
                let c = 0;
                data.forEach((gridData, index) => {
                    if (!gridData[2]['symbol']) {
                        return;
                    }
                    c = this._drawDataGrid({ vertices, colors, indices }, c, gridData, this._compiledSymbols[i][index], gridInfo);
                });
            }

            if (!this.dataGridBuffer[i]) {
                vertices = this._dataVertices[i] = new Float32Array(vertices);
                colors = this._dataColors[i] = new Uint8Array(colors);
                indices = this._dataIndices[i] = new Uint32Array(indices);
                this.dataGridBuffer[i] = this.createBuffer();
                this.dataGridIndexBuffer[i] = this.createBuffer();
                this.dataColorsBuffer[i] = this.createBuffer();
            }

            this._updateUniforms();

            gl.bindBuffer(gl.ARRAY_BUFFER, this.dataGridBuffer[i]);
            this.enableVertexAttrib([['a_position', 3]]);
            if (vertices.length > 0) {
                gl.bufferData(gl.ARRAY_BUFFER, vertices, isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.dataColorsBuffer[i]);
            this.enableVertexAttrib([['a_color', 3, 'UNSIGNED_BYTE'], ['a_opacity', 1, 'UNSIGNED_BYTE']]);
            if (colors.length > 0) {
                gl.bufferData(gl.ARRAY_BUFFER, colors, isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
            }

            // Write the indices to the buffer object
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.dataGridIndexBuffer[i]);
            if (indices.length > 0) {
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, isDynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
                this.paintedGridNum[i] = indices.length;
            }
            gl.drawElements(gl.TRIANGLES, this.paintedGridNum[i], gl.UNSIGNED_INT, 0);

        }

        gl.disableVertexAttribArray(gl.getAttribLocation(gl.program, 'a_position'));
        gl.disableVertexAttribArray(gl.getAttribLocation(gl.program, 'a_color'));
        gl.disableVertexAttribArray(gl.getAttribLocation(gl.program, 'a_opacity'));
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

        let b = c / 3 * 4,
            a = c / 2;

        const set = p => {
            vertices[c++] = p;
        };

        const setIndices = p => {
            indices[a++] = p;
        };

        const setColor = p => {
            colors[b++] = p;
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
                setIndices(idx);
                setIndices(idx + 1);
                setIndices(idx + 2);
                setIndices(idx);
                setIndices(idx + 2);
                setIndices(idx + 3);
                set(p1.x);
                set(p1.y);
                set(z);
                style.forEach(setColor);
                set(p2.x);
                set(p2.y);
                set(z);
                style.forEach(setColor);
                set(p3.x);
                set(p3.y);
                set(z);
                style.forEach(setColor);
                set(p4.x);
                set(p4.y);
                set(z);
                style.forEach(setColor);
            }
        }

        return c;
    }


    _drawAllLabels() {
        const count = this.layer.getGridCount();
        for (let i = 0; i < count; i++) {
            const grid = this.layer.getGrid(i),
                gridInfo = grid['unit'] === 'projection' ? this._getProjGridToDraw(grid, i) : this._getGridToDraw(grid, i),
                data = grid['data'];
            if (!gridInfo || !Array.isArray(data) || !data.length) {
                continue;
            }
            data.forEach((gridData, index) => {
                this._drawLabel(i, gridData, index, gridInfo);
            });
        }

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
        delete this.paintedGridNum;
        delete this._dataVertices;
        delete this._dataColors;
        delete this._dataIndices;
    }

    onCanvasCreate() {
        //create a canvas2 to draw grids with webgl
        //texts will be still drawn by (this.canvas + this.context)
        this.canvas2 = maptalks.Canvas.createCanvas(this.canvas.width, this.canvas.height);
        const gl = this.gl = this._createGLContext(this.canvas2, this.layer.options['glOptions']);
        gl.getExtension('OES_element_index_uint');
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        // const map = this.getMap();
        // gl.viewport(0, 0, map.width, map.height);
        // gl.disable(gl.DEPTH_TEST);
        // gl.disable(gl.STENCIL_TEST);
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
        const map = this.getMap();
        const dpr = map.getDevicePixelRatio ? map.getDevicePixelRatio() : 2;
        if (maptalks.Browser.retina) {
            ctx.save();
            // ctx.translate(map.width / 2 / dpr, map.height / 2 / dpr);
            ctx.scale(1 / dpr, 1 / dpr);
        }
        // draw gl canvas on layer canvas
        ctx.drawImage(this.canvas2, 0, 0, this.canvas2.width, this.canvas2.height);
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
                gl.enableVertexAttribArray(attr);
                gl.vertexAttribPointer(attr, attributes[i][1], gl[attributes[i][2] || 'FLOAT'], false, FSIZE * STRIDE, FSIZE * offset);
                offset += (attributes[i][1] || 0);

            }
        } else {
            const attr = gl.getAttribLocation(gl.program, attributes[0]);
            gl.enableVertexAttribArray(attr);
            gl.vertexAttribPointer(attr, attributes[1], gl[attributes[2] || 'FLOAT'], false, 0, 0);
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
            'alpha': true,
            'preserveDrawingBuffer': true
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

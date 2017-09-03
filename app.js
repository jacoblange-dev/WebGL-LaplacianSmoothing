var vertexShaderText =
`
precision mediump float;

attribute vec3 vertPosition;
attribute vec3 vertNormal;

varying vec3 fragNormal;

uniform mat4 mWorld;
uniform mat4 mView;
uniform mat4 mProj;

void main()
{
    fragNormal = vertNormal;
    gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
}
`;

var fragmentShaderText =
`
precision mediump float;

varying vec3 fragNormal;

void main()
{
    gl_FragColor = vec4(fragNormal, 1.0);
}
`;

var bunny = {};
var InitDemo = function()
{
    loadBunnyObj(function(objText) {
        bunny.vertices = [];
        bunny.indices = [];
        bunny.normals = [];
        var lines = objText.split("\n");
        for (var i = 0; i < lines.length; i++)
        {
            if (lines[i][0] == "#")
                continue;

            var line = lines[i].split(/\s+/);
            if (line[0] == "v")
            {
                line.shift();
                bunny.vertices.push(line[0]);
                bunny.vertices.push(line[1]);
                bunny.vertices.push(line[2]);
            }
            else if (line[0] == "vn")
            {
                line.shift();
                bunny.normals.push(line[0]);
                bunny.normals.push(line[1]);
                bunny.normals.push(line[2]);
            }
            else if (line[0] == "f")
            {
                line.shift();
                
                for (var j = 0; j < line.length; j++)
                {
                    var index = line[j].split("/");
                    bunny.indices.push(index[0] - 1);
                }
            }
        }
        runScene(bunny);
    });
};

var runScene = function(bunnyMesh) {
    var canvas = document.getElementById('webgl-surface');
    var gl = canvas.getContext('webgl');

    if (!gl) {
        console.log('could not  get webgl surface');
        alert('Your browser does not support WebGL');
        return;
    }

    gl.clearColor(0.75, 0.85, 0.8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    // create shaders
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderText);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderText);

    // create program
    var program = createProgram(gl, vertexShader, fragmentShader);

    // create buffers
    var boxVertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bunnyMesh.vertices), gl.STATIC_DRAW);

    var boxIndexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boxIndexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(bunnyMesh.indices), gl.STATIC_DRAW);
    
    var boxNormalBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxNormalBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bunnyMesh.normals), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, boxVertexBufferObject);    
    var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
    gl.vertexAttribPointer(
        positionAttribLocation,
        3,
        gl.FLOAT,
        gl.FALSE,
        3 * Float32Array.BYTES_PER_ELEMENT,
        0
    );
    gl.enableVertexAttribArray(positionAttribLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, boxNormalBufferObject);
    var vertNormalAttribLocation = gl.getAttribLocation(program, 'vertNormal');
    gl.vertexAttribPointer(
        vertNormalAttribLocation,
        3,
        gl.FLOAT,
        gl.TRUE,
        3 * Float32Array.BYTES_PER_ELEMENT,
        0
    );
    gl.enableVertexAttribArray(vertNormalAttribLocation);

    gl.useProgram(program);
    var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
    var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
    var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

    var worldMatrix = new Float32Array(16);
    var viewMatrix = new Float32Array(16);
    var projMatrix = new Float32Array(16);

    mat4.identity(worldMatrix);
    mat4.lookAt(viewMatrix, [0, 0, -8], [0, 0, 0], [0, 1, 0]);
    mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.width / canvas.height, 0.1, 1000.0);

    gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
    gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

    // main render loop
    var identityMatrix = new Float32Array(16);
    mat4.identity(identityMatrix);

    var angle = 0;
    var loop = function () {
        angle = performance.now() / 1000 / 6 * 2 * Math.PI;
        mat4.rotate(worldMatrix, identityMatrix, angle, [0, 1, 0]);
        gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);

        gl.clearColor(0.75, 0.85, 0.8, 1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

        gl.drawElements(gl.TRIANGLES, bunnyMesh.indices.length, gl.UNSIGNED_SHORT, 0);

        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
};

function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

function loadBunnyObj(callback) {
    var request = new XMLHttpRequest();
    request.open("GET", "bunny.obj", true);
    request.onload = function() {
        if (request.status == 200 && request.readyState == 4) {
            callback(request.responseText);
        }
    }
    request.send();
}
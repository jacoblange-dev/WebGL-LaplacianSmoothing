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
    fragNormal = (mWorld * vec4(vertNormal, 0.0)).xyz;
    gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
}
`;

var fragmentShaderText =
`
precision mediump float;

varying vec3 fragNormal;

void main()
{
    vec3 ambientLightIntensity = vec3(0.2, 0.2, 0.2);
    vec3 sunlightIntensity = vec3(0.9, 0.9, 0.9);
    vec3 sunlightDirection = normalize(vec3(1.0, 1.0, -2.0));

    vec3 color = vec3(0.7, 0.7, 0.7);

    vec3 lightIntensity = ambientLightIntensity + sunlightIntensity * max(dot(fragNormal, sunlightDirection), 0.0);

    gl_FragColor = vec4(color * lightIntensity, 1.0);
}
`;

var bunny = {};
var stopDemo = false;

var initDemo = function()
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
    stopDemo = false;
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
    mat4.lookAt(viewMatrix, [0, 3, -8], [0, 1, 0], [0, 1, 0]);
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

        if (!stopDemo)
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

function runSmoothing()
{
    bunny.vertices = laplacianFilter(bunny.vertices, bunny.indices, 10);
    stopDemo = true;
    runScene(bunny);
}

function laplacianFilter(vertices, indices, iterations)
{
    var network = buildNetwork(indices);

    for (var i = 0; i < iterations; i++)
        vertices = laplacianFilterStep(network, vertices, indices);

    return vertices;
}

function laplacianFilterStep(network, vertices, indices)
{
    var filteredVertices = [];

    for (var i = 0; i < vertices.length; i += 3)
    {
        var vertexNumber = i / 3;
        var connections = network[vertexNumber].adjacentIndices;
        var newVertex = vec3.create();

        for (const index of Object.keys(connections))
        {
            var currentVertex = vec3.fromValues(vertices[3 * parseInt(index)], vertices[3 * parseInt(index) + 1], vertices[3 * parseInt(index) + 2]);

            vec3.add(newVertex, newVertex, currentVertex);
        }
        var connectionsLength = Object.keys(connections).length;

        filteredVertices[i]     = newVertex[0] / connectionsLength;
        filteredVertices[i + 1] = newVertex[1] / connectionsLength;
        filteredVertices[i + 2] = newVertex[2] / connectionsLength;
    }

    return filteredVertices;
}


function buildNetwork(indices)
{
    var network = {};

    for (var i = 0; i < indices.length; i += 3)
    {
        var indexA = indices[i];
        var indexB = indices[i + 1];
        var indexC = indices[i + 2];

        if (!network.hasOwnProperty(indexA))
            network[indexA] = { adjacentIndices: {}};

        if (!network.hasOwnProperty(indexB))
            network[indexB] = { adjacentIndices: {} };

        if (!network.hasOwnProperty(indexC))
            network[indexC] = { adjacentIndices: {} };

        network[indexA].adjacentIndices[indexB] = true;
        network[indexA].adjacentIndices[indexC] = true;

        network[indexB].adjacentIndices[indexA] = true;
        network[indexB].adjacentIndices[indexC] = true;

        network[indexC].adjacentIndices[indexA] = true;
        network[indexC].adjacentIndices[indexB] = true;
    }

    return network;
}
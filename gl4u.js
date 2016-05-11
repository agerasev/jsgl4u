var gl = null;

function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	}
	catch(e) {}
	
	if(!gl) {
		console.error("unable to initialize WebGL");
		gl = null;
	}
	
	return gl;
}

function Buffer(type, data) {
	var self = this;
	self.id = gl.createBuffer();
	self.type = type;

	self.bind = function() {
		gl.bindBuffer(gl.ARRAY_BUFFER, self.id);
	}

	self.buffer = function(data) {
		self.bind();

		var tarr = null;
		if(self.type == gl.FLOAT) {
			if(data.name == 'Float32Array') {
				tarr = data;
			} else {
				tarr = new Float32Array(data); 
			}
		} else if(self.type == gl.INT) {
			if(data.name == 'Int32Array') {
				tarr = data;
			} else {
				tarr = new Int32Array(data);
			}
		}
		gl.bufferData(gl.ARRAY_BUFFER, tarr, gl.STATIC_DRAW);
	}

	if(data != undefined) {
		self.buffer(data);
	}
}

function Shader(type, source) {
	var self = this;
	self.type = type;

	self.id = gl.createShader(type);
	gl.shaderSource(self.id, source);

	gl.compileShader(self.id);
	if(!gl.getShaderParameter(self.id, gl.COMPILE_STATUS)) {	
		console.error("shader compile error:\n" + gl.getShaderInfoLog(self.id));	
		return;
	}

	self.attribs = [];
	if(type == gl.VERTEX_SHADER) {
		var re = /(attribute|in)\s+(\w+)\s+(\w+)\s*;/g;
		var res = null;
		while((res = re.exec(source)) != null) {
			var attr = {};
			attr.type = res[2];
			attr.name = res[3];
			self.attribs.push(attr);
		}
	}
	
	self.uniforms = [];
	var re = /(uniform)\s+(\w+)\s+(\w+)\s*;/g;
	var res = null;
	while((res = re.exec(source)) != null) {
		var unif = {};
		unif.type = res[2];
		unif.name = res[3];
		self.uniforms.push(unif);
	}
}

function __parseGLType(type) {
	var re = /([A-Za-z_]+)(\d*)/;
	res = re.exec(type);
	tn = res[1];
	td = res[2];
	if(tn == 'float') {
		return [gl.FLOAT, 1];
	}
	if(tn == 'vec') {
		return [gl.FLOAT, td];
	}
	if(tn == 'mat') {
		return [gl.FLOAT, td*td, td, td];
	}
	if(tn == 'int') {
		return [gl.INT, 1];
	}
	if(tn == 'ivec') {
		return [gl.INT, td];
	}
	if(tn == 'imat') {
		return [gl.INT, td*td, td, td];
	}
	return null;
}

function Program(shaders) {
	var self = this;
	self.id = gl.createProgram();
	self.shaders = [];
	for(var i in shaders) {
		var shader = shaders[i];
		self.shaders.push(shader);
		gl.attachShader(self.id, shader.id);
	}

	gl.linkProgram(self.id);
	if(!gl.getProgramParameter(self.id, gl.LINK_STATUS)) {
		console.error("program link error:\n" + gl.getProgramInfoLog(self.id));
		return;
	}

	self.attribs = {};
	self.uniforms = {};
	for(var i in self.shaders) {
		var shader = shaders[i];
		for(var j in shader.attribs) {
			var attr = shader.attribs[j];
			self.attribs[attr.name] = {
				id: gl.getAttribLocation(self.id, attr.name),
				data: null,
				name: attr.name,
				type: __parseGLType(attr.type)
			}
		}
		for(var j in shader.uniforms) {
			var unif = shader.uniforms[j];
			self.uniforms[unif.name] = {
				id: gl.getUniformLocation(self.id, unif.name),
				data: null,
				name: unif.name,
				type: __parseGLType(unif.type)
			}
		}
	}

	self.use = function() {
		gl.useProgram(self.id);
	}

	self.exec = function(mode, begin, end) {
		self.use();

		// TODO: load uniforms

		for(var i in self.attribs) {
			var attr = self.attribs[i];
			gl.enableVertexAttribArray(attr.id);
		}

		for(var i in self.attribs) {
			var attr = self.attribs[i];
			if(attr.data.type != attr.type[0]) {
				console.error('buffer and attrib "' + attr.name + '" type mismatch');
			}
			attr.data.bind();
			gl.vertexAttribPointer(attr.id, attr.type[1], attr.type[0], false, 0, 0);
		}

		gl.drawArrays(mode, begin, end);

		for(var i in self.attribs) {
			var attr = self.attribs[i];
			gl.disableVertexAttribArray(attr.id);
		}
	}
}
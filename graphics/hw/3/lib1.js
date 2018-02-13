
//////////////////////////////////////////////////////////////////////////////////////////
//
// THIS IS THE SUPPORT LIBRARY.  YOU PROBABLY DON'T WANT TO CHANGE ANYTHING HERE JUST YET.
//
//////////////////////////////////////////////////////////////////////////////////////////

var fragmentShaderHeader = [''                      // WHATEVER CODE WE'D LIKE TO PREDEFINE FOR FRAGMENT SHADERS
,'   precision highp float;'
].join('\n');

var nfsh = fragmentShaderHeader.split('\n').length; // NUMBER OF LINES OF CODE IN fragmentShaderHeader

var isFirefox = navigator.userAgent.indexOf('Firefox') > 0;
var errorMsg = '';

function gl_start(canvas, vertexShader, fragmentShader) {           // START WEBGL RUNNING IN A CANVAS

   setTimeout(function() {
      try { 
         canvas.gl = canvas.getContext('experimental-webgl');                 // Make sure WebGl is supported.
      } catch (e) { throw 'Sorry, your browser does not support WebGL.'; }

      canvas.setShaders = function(vertexShader, fragmentShader) {            // Add the vertex and fragment shaders:

         var gl = this.gl, program = gl.createProgram();                           // Create the WebGL program.

         function addshader(type, src) {                                           // Create and attach a WebGL shader.
	    function spacer(color, width, height) {
	       return '<table bgcolor=' + color +
	                    ' width='   + width +
			    ' height='  + height + '><tr><td>&nbsp;</td></tr></table>';
	    }
	    errorMessage.innerHTML = '<br>';
	    errorMarker.innerHTML = spacer('black', 1, 1) + '<font size=5 color=black>\u25B6</font>';
            var shader = gl.createShader(type);
            gl.shaderSource(shader, src);
            gl.compileShader(shader);
            if (! gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
               let msg = gl.getShaderInfoLog(shader);
               console.log('Cannot compile shader:\n\n' + msg);

	       let a = msg.substring(6, msg.length);
	       if (a.substring(0, 3) == ' 0:') {
	          a = a.substring(3, a.length);
	          let line = parseInt(a) - nfsh + 1;
		  let nPixels = isFirefox ? 13 * line - 10 : 13 * line - 1;
	          errorMarker.innerHTML = spacer('black', 1, nPixels) + '<font size=5>\u25B6</font>';
               }

	       let j = a.indexOf(':');
	       a = a.substring(j+2, a.length);
	       if ((j = a.indexOf('\n')) > 0)
	          a = a.substring(0, j);
	       errorMessage.innerHTML = a;
            }
            gl.attachShader(program, shader);
         };

         addshader(gl.VERTEX_SHADER  , vertexShader  );                            // Add the vertex and fragment shaders.
         addshader(gl.FRAGMENT_SHADER, fragmentShaderHeader + fragmentShader);

         gl.linkProgram(program);                                                  // Link the program and report any errors.
         if (! gl.getProgramParameter(program, gl.LINK_STATUS))
            console.log('Could not link the shader program!');
         gl.useProgram(program);
	 gl.program = program;

         gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());                        // Create a square as a triangle strip
         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(                          //    consisting of two triangles.
                       [ -1,1,0, 1,1,0, -1,-1,0, 1,-1,0 ]), gl.STATIC_DRAW);

         var aPos = gl.getAttribLocation(program, 'aPos');                         // Assign aPos attribute to each vertex.
         gl.enableVertexAttribArray(aPos);
         gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
      }

      canvas.setShaders(vertexShader, fragmentShader);                        // Initialize everything,

      setInterval(function() {                                                // Start the animation loop.
         gl = canvas.gl;
         if (gl.startTime === undefined)                                               // First time through,
            gl.startTime = Date.now();                                                 //    record the start time.
         animate(gl);
         gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);                                       // Render the square.

         //console.log(getCanvasData(canvas));
      }, 30);

   }, 100); // Wait 100 milliseconds after page has loaded before starting WebGL.
}

function animate() { }

var gl;
function setUniform(type, name, a, b, c, d, e, f) {
   let loc = gl.getUniformLocation(gl.program, name);
   (gl['uniform' + type])(loc, a, b, c, d, e, f);
}

function getCanvasData(canvas) {
   if (window._cdc === undefined) {
      window._cdc = document.createElement('canvas');
      _cdc.width = canvas.width;
      _cdc.height = canvas.height;
   }
   var ctx = _cdc.getContext("2d");
   ctx.drawImage(canvas, 0, 0);
   return ctx.getImageData(0, 0, _cdc.width, _cdc.height).data;
}


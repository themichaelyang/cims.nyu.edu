
var fragmentShaderHeader = [''               // PREDEFINE NOISE AND TURBULENCE FUNCTIONS FOR FRAGMENT SHADERS
,'   precision highp float;'
,'   vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }'
,'   vec4 mod289(vec4 x) { return x - floor(x * (1. / 289.)) * 289.; }'
,'   vec4 permute(vec4 x) { return mod289(((x*34.)+1.)*x); }'
,'   vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - .85373472095314 * r; }'
,'   vec3 fade(vec3 t) { return t*t*t*(t*(t*6.-15.)+10.); }'
,'   float noise(vec3 P) {'
,'      vec3 i0 = mod289(floor(P)), i1 = mod289(i0 + vec3(1.)),'
,'           f0 = fract(P), f1 = f0 - vec3(1.), f = fade(f0);'
,'      vec4 ix = vec4(i0.x, i1.x, i0.x, i1.x), iy = vec4(i0.yy, i1.yy),'
,'           iz0 = i0.zzzz, iz1 = i1.zzzz,'
,'           ixy = permute(permute(ix) + iy), ixy0 = permute(ixy + iz0), ixy1 = permute(ixy + iz1),'
,'           gx0 = ixy0 * (1. / 7.), gy0 = fract(floor(gx0) * (1. / 7.)) - .5,'
,'           gx1 = ixy1 * (1. / 7.), gy1 = fract(floor(gx1) * (1. / 7.)) - .5;'
,'      gx0 = fract(gx0); gx1 = fract(gx1);'
,'      vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0), sz0 = step(gz0, vec4(0.)),'
,'           gz1 = vec4(0.5) - abs(gx1) - abs(gy1), sz1 = step(gz1, vec4(0.));'
,'      gx0 -= sz0 * (step(0., gx0) - .5); gy0 -= sz0 * (step(0., gy0) - .5);'
,'      gx1 -= sz1 * (step(0., gx1) - .5); gy1 -= sz1 * (step(0., gy1) - .5);'
,'      vec3 g0 = vec3(gx0.x,gy0.x,gz0.x), g1 = vec3(gx0.y,gy0.y,gz0.y),'
,'           g2 = vec3(gx0.z,gy0.z,gz0.z), g3 = vec3(gx0.w,gy0.w,gz0.w),'
,'           g4 = vec3(gx1.x,gy1.x,gz1.x), g5 = vec3(gx1.y,gy1.y,gz1.y),'
,'           g6 = vec3(gx1.z,gy1.z,gz1.z), g7 = vec3(gx1.w,gy1.w,gz1.w);'
,'      vec4 norm0 = taylorInvSqrt(vec4(dot(g0,g0), dot(g2,g2), dot(g1,g1), dot(g3,g3))),'
,'           norm1 = taylorInvSqrt(vec4(dot(g4,g4), dot(g6,g6), dot(g5,g5), dot(g7,g7)));'
,'      g0 *= norm0.x; g2 *= norm0.y; g1 *= norm0.z; g3 *= norm0.w;'
,'      g4 *= norm1.x; g6 *= norm1.y; g5 *= norm1.z; g7 *= norm1.w;'
,'      vec4 nz = mix(vec4(dot(g0, vec3(f0.x, f0.y, f0.z)), dot(g1, vec3(f1.x, f0.y, f0.z)),'
,'                         dot(g2, vec3(f0.x, f1.y, f0.z)), dot(g3, vec3(f1.x, f1.y, f0.z))),'
,'                    vec4(dot(g4, vec3(f0.x, f0.y, f1.z)), dot(g5, vec3(f1.x, f0.y, f1.z)),'
,'                         dot(g6, vec3(f0.x, f1.y, f1.z)), dot(g7, vec3(f1.x, f1.y, f1.z))), f.z);'
,'      return 2.2 * mix(mix(nz.x,nz.z,f.y), mix(nz.y,nz.w,f.y), f.x);'
,'   }'
,'   float turbulence(vec3 P) {'              // Turbulence is a fractal sum of abs(noise).
,'      float f = 0., s = 1.;'                // The domain is rotated after every iteration
,'      for (int i = 0 ; i < 9 ; i++) {'      //    to avoid any visible grid artifacts.
,'         f += abs(noise(s * P)) / s;'
,'         s *= 2.;'
,'         P = vec3(.866 * P.x + .5 * P.z, P.y + 100., -.5 * P.x + .866 * P.z);'
,'      }'
,'      return f;'
,'   }'
].join('\n');

var isFirefox = navigator.userAgent.indexOf('Firefox') > 0;

var cursor = [0,0,0];
var errorMsg = '';
var gl;
var triangleStrip;
var vertexSize = 8;

function setBuffer(gl, triangleStrip) {
   gl._bufferSize = triangleStrip.length / vertexSize;
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleStrip), gl.STATIC_DRAW);
}

function drawBuffer(gl) {
   gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl._bufferSize);
}

function gl_start(canvas, vertexShader, fragmentShader) {           // START WEBGL RUNNING IN A CANVAS

   // Convenience functions for tracking the cursor within the canvas.

   function setMouse(z) {
      var r = event.target.getBoundingClientRect();
      cursor[0] = (event.clientX - r.left  ) / (r.right - r.left) * 2 - 1;
      cursor[1] = (event.clientY - r.bottom) / (r.top - r.bottom) * 2 - 1;
      if (z !== undefined)
         cursor[2] = z;
   }
   canvas.onmousedown = function(event) { setMouse(1); } // On mouse down, set z to 1.
   canvas.onmousemove = function(event) { setMouse() ; }
   canvas.onmouseup   = function(event) { setMouse(0); } // On mouse up  , set z to 0.

   setTimeout(function() {
      try { 
         canvas.gl = canvas.getContext('experimental-webgl');              // Make sure WebGl is supported.
      } catch (e) { throw 'Sorry, your browser does not support WebGL.'; }

      canvas.setShaders = function(vertexShader, fragmentShader) {         // Add the vertex and fragment shaders:

         var gl = this.gl, program = gl.createProgram();                        // Create the WebGL program.

         function addshader(type, src) {                                        // Create and attach a WebGL shader.
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
                  let line = parseInt(a) - 43;
                  let nPixels = isFirefox ? 17 * line - 10 : 18 * line - 1;
                  errorMarker.innerHTML = spacer('black', 1, nPixels) + '<font size=5>\u25B6</font>';
               }

               let j = a.indexOf(':');
               a = a.substring(j+2, a.length);
               if ((j = a.indexOf('\n')) > 0)
                  a = a.substring(0, j);
               errorMessage.innerHTML = a;
            }
            gl.attachShader(program, shader);

	    gl.enable(gl.DEPTH_TEST);                               // Enable depth testing, so nearer objects will
	    gl.depthFunc(gl.LEQUAL);                                // overwrite objects that are farther away.
         };

         addshader(gl.VERTEX_SHADER  , vertexShader  );                        // Add vertex and fragment shaders.
         addshader(gl.FRAGMENT_SHADER, fragmentShaderHeader + fragmentShader);

         gl.linkProgram(program);                                              // Link program and report any errors.
         if (! gl.getProgramParameter(program, gl.LINK_STATUS))
            console.log('Could not link the shader program!');
         gl.useProgram(program);
         gl.program = program;

         gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());         // Create GPU buffer to store vertex attribute data.

         function vertexFloatAttr(name, size, pos) {                // Convenience function to make it easier to
            var loc = gl.getAttribLocation(program, name);          // set a vertex attribute that has float values.
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, vertexSize * 4, pos * 4);
         }

         vertexFloatAttr('aPos', 3, 0);    // Position              // Design a layout for the attributes of
         vertexFloatAttr('aNor', 3, 3);    // Normal                // each vertex in the triangle strip.
         vertexFloatAttr('aUV' , 2, 6);    // Texture u,v
      }

      canvas.setShaders(vertexShader, fragmentShader);              // Initialize everything,

      setInterval(function() {                                      // Start the animation loop.
         gl = canvas.gl;
         if (gl.startTime === undefined)                               // First time through,
            gl.startTime = Date.now();                                 //    record the start time.
         animate(gl);
      }, 30);

   }, 100); // Wait 100 milliseconds after page has loaded before starting WebGL.
}

function animate() { }                                              // Dummy placeholder for animation callback

function setUniform(type, name, a, b, c, d, e, f) {                 // Convenience function for defining
   let loc = gl.getUniformLocation(gl.program, name);               // a uniform shader variable.
   (gl['uniform' + type])(loc, a, b, c, d, e, f);
}

function matrixInvert(src) {                                        // Invert a matrix.  This is very useful for
  function s(col, row) { return src[col & 3 | (row & 3) << 2]; }    // transforming surface normals!
  function cofactor(c0, r0) {
     var c1 = c0+1, c2 = c0+2, c3 = c0+3, r1 = r0+1, r2 = r0+2, r3 = r0+3;
     return (c0 + r0 & 1 ? -1 : 1) * ( (s(c1, r1) * (s(c2, r2) * s(c3, r3) - s(c3, r2) * s(c2, r3)))
                                     - (s(c2, r1) * (s(c1, r2) * s(c3, r3) - s(c3, r2) * s(c1, r3)))
                                     + (s(c3, r1) * (s(c1, r2) * s(c2, r3) - s(c2, r2) * s(c1, r3))) );
  }
  var n, dst = [], det = 0;
  for (n = 0 ; n < 16 ; n++) dst.push(cofactor(n >> 2, n & 3));
  for (n = 0 ; n <  4 ; n++) det += src[n] * dst[n << 2];
  for (n = 0 ; n < 16 ; n++) dst[n] /= det;
  return dst;
}


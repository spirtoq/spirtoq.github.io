/* ═══════════════════════════════════════════════════════════════
   gl.js — WebGL2 field renderer + matrix rain
   No dependencies. Degrades to CSS gradient if context is lost.
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SPIRTOQ = global.SPIRTOQ || (global.SPIRTOQ = {});
  var root = document.documentElement;

  /* ────────────────────────────────────────────────────────────
     THEME PALETTES → sent to the shader
     ──────────────────────────────────────────────────────────── */
  var PALETTES = {
    cyan:   { a: [0.00, 0.95, 1.00], b: [1.00, 0.18, 0.53], c: [0.55, 0.36, 1.00] },
    amber:  { a: [1.00, 0.69, 0.13], b: [1.00, 0.24, 0.00], c: [1.00, 0.84, 0.31] },
    matrix: { a: [0.15, 1.00, 0.53], b: [0.00, 1.00, 0.61], c: [0.78, 1.00, 0.00] },
    void:   { a: [0.90, 0.94, 1.00], b: [0.55, 0.60, 0.68], c: [0.70, 0.74, 0.82] },
    blood:  { a: [1.00, 0.16, 0.16], b: [1.00, 0.42, 0.00], c: [0.75, 0.00, 0.00] }
  };

  /* ────────────────────────────────────────────────────────────
     SHADERS
     ──────────────────────────────────────────────────────────── */
  var VERT = [
    '#version 300 es',
    'void main(){',
    '  float x = float((gl_VertexID << 1) & 2);',
    '  float y = float(gl_VertexID & 2);',
    '  gl_Position = vec4(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'out vec4 O;',
    '',
    'uniform vec2  uRes;',
    'uniform float uT;',
    'uniform vec2  uM;',
    'uniform float uE;',      // interaction energy 0..1
    'uniform float uGod;',    // god-mode mix
    'uniform vec3  uA;',
    'uniform vec3  uB;',
    'uniform vec3  uC;',
    '',
    'float h21(vec2 p){',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 34.345);',
    '  return fract(p.x * p.y);',
    '}',
    '',
    'float vn(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix( mix(h21(i), h21(i + vec2(1,0)), u.x),',
    '               mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y );',
    '}',
    '',
    'float fbm(vec2 p){',
    '  float s = 0.0, a = 0.52;',
    '  mat2 m = mat2(1.62, 1.18, -1.18, 1.62);',
    '  for(int i = 0; i < 5; i++){ s += a * vn(p); p = m * p; a *= 0.5; }',
    '  return s;',
    '}',
    '',
    'float hexDist(vec2 p){',
    '  p = abs(p);',
    '  return max(dot(p, normalize(vec2(1.0, 1.73205))), p.x);',
    '}',
    '',
    'void main(){',
    '  float mn = min(uRes.x, uRes.y);',
    '  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / mn;',
    '  vec2 mp = (uM - 0.5 * uRes) / mn;',
    '  float t = uT;',
    '',
    /* ── cursor-driven lens warp ─────────────────────────── */
    '  vec2 d2 = uv - mp;',
    '  float dm = length(d2);',
    '  vec2 dir = d2 / max(dm, 1e-4);',
    '  vec2 w = uv + dir * (0.070 / (dm + 0.42)) * (0.65 + uE * 0.9);',
    '  float ring = sin(dm * 20.0 - t * 3.0) * exp(-dm * 3.0) * uE;',
    '  w += dir * ring * 0.022;',
    '',
    /* ── layered nebula ──────────────────────────────────── */
    '  float f1 = fbm(w * 1.30 + vec2(t * 0.030, -t * 0.021));',
    '  f1 = f1 * f1 * (3.0 - 2.0 * f1);',
    '  float f2 = fbm(w * 2.55 + f1 * 1.35 - vec2(t * 0.045, t * 0.028));',
    '  float f3 = fbm(w * 5.10 - vec2(t * 0.060, t * 0.014));',
    '',
    '  vec3 col = uA * pow(f1, 2.20) * 0.98;',
    '  col    += uB * pow(f2, 2.90) * 0.56;',
    '  col    += uC * pow(f3, 3.70) * 0.22;',
    '',
    /* ── hex lattice ─────────────────────────────────────── */
    '  vec2 hp = w * 6.4;',
    '  hp.x *= 1.1547;',
    '  hp += vec2(0.0, t * 0.10);',
    '  float hd = hexDist(hp);',
    '  float edge = smoothstep(0.38, 0.50, hd);',
    '  edge *= 0.35 + 0.65 * (0.5 + 0.5 * sin(t * 1.4 + f1 * 7.0));',
    '  col += uA * edge * 0.105;',
    '',
    /* ── core + breathing halo ───────────────────────────── */
    '  float core = exp(-length(w * vec2(1.0, 1.28)) * 2.30);',
    '  col += uA * core * (0.16 + 0.09 * sin(t * 0.9) + uE * 0.22);',
    '',
    /* ── god mode: shockwave lattice ─────────────────────── */
    '  if(uGod > 0.001){',
    '    float rd = length(uv * vec2(1.0, 1.2));',
    '    float sw = abs(fract(rd * 1.45 - t * 0.30) - 0.5);',
    '    float pulse = smoothstep(0.055, 0.0, sw) * smoothstep(1.15, 0.05, rd);',
    '    vec3 hot = vec3(1.0, 0.42, 0.06);',
    '    col = mix(col, col * 1.45 + hot * pulse * 0.9, uGod);',
    '    col += hot * pow(f2, 2.0) * 0.30 * uGod;',
    '  }',
    '',
    /* ── grade ───────────────────────────────────────────── */
    '  col *= 1.0 - 0.36 * dot(uv, uv) * 0.9;',            // vignette
    '  col = vec3(1.0) - exp(-col * 2.05);',                // filmic-ish rolloff
    '  col = pow(max(col, 0.0), vec3(0.88));',             // lift
    '',
    '  float g = h21(gl_FragCoord.xy + fract(t) * 137.0) - 0.5;',
    '  col += g * 0.022;',                                   // dither/grain
    '',
    '  O = vec4(col, 1.0);',
    '}'
  ].join('\n');

  /* ────────────────────────────────────────────────────────────
     BOOTSTRAP
     ──────────────────────────────────────────────────────────── */
  var canvas = document.getElementById('gl');
  var api = { ready: false, energy: 0, god: 0 };
  api.src = { VERT: VERT, FRAG: FRAG };   /* kept for offline shader checks */
  SPIRTOQ.gl = api;

  if (!canvas) { finish(null); } else { init(); }

  function finish(gl) {
    if (!gl) { root.classList.add('no-gl'); api.ready = false; return; }
    root.classList.add('gl-ready');
    api.ready = true;
  }

  function init() {
    var gl = null;
    var opts = { alpha: true, antialias: false, depth: false, stencil: false,
                 premultipliedAlpha: false, powerPreference: 'high-performance',
                 preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: false };
    try { gl = canvas.getContext('webgl2', opts); } catch (e) { gl = null; }
    if (!gl) { finish(null); return; }

    var prog = build(gl);
    if (!prog) { finish(null); return; }

    finish(gl);

    var U = {};
    ['uRes','uT','uM','uE','uGod','uA','uB','uC'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.useProgram(prog);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    /* state */
    var dpr = 1, W = 0, H = 0;
    var mx = 0, my = 0, tx = 0, ty = 0;
    var energy = 0, tEnergy = 0, god = 0, tGod = 0;
    var t0 = performance.now(), paused = 0, raf = 0, running = true;
    var cur = Object.assign({}, PALETTES.cyan);
    var target = cur;

    resize();
    api.energy = function (v) { tEnergy = Math.max(0, Math.min(1, v)); };
    api.god   = function (v) { tGod = v ? 1 : 0; };
    api.setTheme = function (name) { target = PALETTES[name] || PALETTES.cyan; };
    api.pulse  = function () { tEnergy = 1; };
    api.stop   = function () { running = false; cancelAnimationFrame(raf); };
    api.start  = function () { if (!running) { running = true; loop(); } };

    function resize() {
      dpr = Math.min(global.devicePixelRatio || 1, 1.75);
      W = Math.max(1, Math.round(global.innerWidth * dpr));
      H = Math.max(1, Math.round(global.innerHeight * dpr));
      canvas.width = W; canvas.height = H;
      canvas.style.width = global.innerWidth + 'px';
      canvas.style.height = global.innerHeight + 'px';
      if (gl) gl.viewport(0, 0, W, H);
      /* keep the lens centred until the pointer reports in */
      if (!tx && !ty) { tx = global.innerWidth / 2; ty = global.innerHeight / 2; }
    }

    addEventListener('resize', resize, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { paused = performance.now(); }
      else if (paused) { t0 += (performance.now() - paused); paused = 0; }
    });

    addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientHeight ? e.clientY : e.clientY;
    }, { passive: true });
    addEventListener('pointerdown', function () { tEnergy = 1; }, { passive: true });

    function frame(now) {
      raf = requestAnimationFrame(frame);
      var t = ((paused ? paused : now) - t0) / 1000;

      /* lerps */
      mx += (tx * dpr - mx) * 0.075;
      my += ((global.innerHeight - ty) * dpr - my) * 0.075;
      energy += (tEnergy - energy) * (tEnergy > energy ? 0.16 : 0.045);
      tEnergy *= 0.965;
      if (energy < 0.002) energy = 0;
      god += (tGod - god) * 0.05;

      for (var k in target) {
        cur[k] = [ cur[k][0] + (target[k][0]-cur[k][0]) * 0.04,
                   cur[k][1] + (target[k][1]-cur[k][1]) * 0.04,
                   cur[k][2] + (target[k][2]-cur[k][2]) * 0.04 ];
      }

      gl.uniform2f(U.uRes, W, H);
      gl.uniform1f(U.uT, t);
      gl.uniform2f(U.uM, mx, my);
      gl.uniform1f(U.uE, energy);
      gl.uniform1f(U.uGod, god);
      gl.uniform3fv(U.uA, cur.a);
      gl.uniform3fv(U.uB, cur.b);
      gl.uniform3fv(U.uC, cur.c);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(){ if (running) raf = requestAnimationFrame(frame); }
    loop();

    /* lose the context gracefully */
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault(); running = false; cancelAnimationFrame(raf);
      root.classList.remove('gl-ready'); root.classList.add('no-gl');
      api.ready = false;
    });
    canvas.addEventListener('webglcontextrestored', function () { location.reload(); });
  }

  function build(gl) {
    var p = compile(gl, VERT, gl.VERTEX_SHADER);
    var f = compile(gl, FRAG, gl.FRAGMENT_SHADER);
    if (!p || !f) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, p); gl.attachShader(prog, f);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[gl] link failed:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  function compile(gl, src, type) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[gl] compile failed:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  /* ────────────────────────────────────────────────────────────
     MATRIX RAIN (2D canvas easter egg)
     ──────────────────────────────────────────────────────────── */
  var rainCv = document.getElementById('rain');
  var rain = { on: false, timer: 0 };

  function Rain() {
    var ctx = rainCv.getContext('2d', { alpha: true });
    if (!ctx) return null;
    var cols, drops, dpr, W, H, size, raf, col, alive, fades = [];

    function pickColor() {
      var cs = getComputedStyle(root);
      return {
        head: cs.getPropertyValue('--a1').trim() || '#0f0',
        tail: cs.getPropertyValue('--muted').trim() || '#040'
      };
    }

    function size1() {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = innerWidth; H = innerHeight;
      rainCv.width = W * dpr; rainCv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size = 15;
      cols = Math.ceil(W / size);
      drops = new Array(cols);
      for (var i = 0; i < cols; i++) drops[i] = Math.random() * -60;
    }

    function frame() {
      col = pickColor();
      ctx.fillStyle = 'rgba(0,0,0,0.085)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = '600 15px "JetBrains Mono", monospace';
      for (var i = 0; i < cols; i++) {
        var txt = glyphs[(Math.random() * glyphs.length) | 0];
        var y = drops[i] * size;
        ctx.fillStyle = col.head;
        ctx.shadowColor = col.head; ctx.shadowBlur = 10;
        ctx.fillText(txt, i * size, y);
        ctx.shadowBlur = 0;
        ctx.fillStyle = col.tail;
        ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * size, y - size);
        if (y > H && Math.random() > 0.975) drops[i] = Math.random() * -25;
        drops[i] += 0.55;
      }
      raf = requestAnimationFrame(frame);
    }

    return {
      start: function () {
        if (alive) return; alive = true; size1();
        addEventListener('resize', size1, { passive: true });
        rainCv.hidden = false; rainCv.classList.add('on');
        frame();
      },
      stop: function () {
        if (!alive) return; alive = false;
        cancelAnimationFrame(raf);
        removeEventListener('resize', size1);
        rainCv.classList.remove('on');
        ctx.clearRect(0, 0, W, H);
        setTimeout(function () { if (!alive) rainCv.hidden = true; }, 700);
      }
    };
  }

  var glyphs = 'SPIRTOQNullSector0123456789ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ'.split('');
  var rainEngine = rainCv ? Rain() : null;

  SPIRTOQ.rain = {
    toggle: function () {
      if (!rainEngine) return false;
      rain.on = !rain.on;
      if (rain.on) rainEngine.start(); else rainEngine.stop();
      return rain.on;
    },
    isOn: function () { return rain.on; }
  };

})(window);

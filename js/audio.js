/* ═══════════════════════════════════════════════════════════════
   audio.js — synthesised UI sound + ambient drone. No audio files.
   Context is created lazily and only resumed after a real gesture.
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SPIRTOQ = global.SPIRTOQ || (global.SPIRTOQ = {});

  var ctx = null, master = null, bus = null, verb = null, verbGain = null;
  var enabled = false, ready = false, ambient = null;
  var lastAt = 0;

  function makeNoiseBuffer(sec) {
    var n = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    return buf;
  }

  function init() {
    if (ready) return true;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }

    master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);

    /* soft bus with a feedback-delay "room" */
    bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(master);

    var dly = ctx.createDelay(0.6);
    dly.delayTime.value = 0.17;
    var fb = ctx.createGain(); fb.gain.value = 0.34;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    verbGain = ctx.createGain(); verbGain.gain.value = 0.5;

    bus.connect(dly);
    dly.connect(lp); lp.connect(fb); fb.connect(dly);
    lp.connect(verbGain); verbGain.connect(master);

    ready = true;
    return true;
  }

  function env(node, t, a, d, peak) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    node.connect(g);
    g.connect(bus);
    return g;
  }

  function tone(opts) {
    if (!ready) return;
    var t = ctx.currentTime + (opts.delay || 0);
    var o = ctx.createOscillator();
    o.type = opts.type || 'sine';
    var f0 = opts.f || 440, f1 = opts.f2 || f0;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) {
      if (opts.exp !== false && o.frequency.exponentialRampToValueAtTime)
        o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + opts.dur);
      else o.frequency.linearRampToValueAtTime(f1, t + opts.dur);
    }
    if (opts.detune) o.detune.value = opts.detune;

    var filt = ctx.createBiquadFilter();
    filt.type = opts.filter || 'lowpass';
    filt.frequency.setValueAtTime(opts.cut || 3200, t);
    if (opts.cut2) filt.frequency.exponentialRampToValueAtTime(opts.cut2, t + opts.dur);
    filt.Q.value = opts.q || 0.8;
    o.connect(filt);

    env(filt, t, opts.a || 0.006, opts.dur, opts.gain || 0.14);
    o.start(t); o.stop(t + opts.dur + (opts.a || 0.006) + 0.05);
  }

  function noise(opts) {
    if (!ready) return;
    var t = ctx.currentTime + (opts.delay || 0);
    var src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(opts.dur + 0.05);
    var bp = ctx.createBiquadFilter();
    bp.type = opts.type || 'bandpass';
    bp.frequency.setValueAtTime(opts.f || 1200, t);
    bp.frequency.exponentialRampToValueAtTime(Math.max(opts.f2 || 400, 40), t + opts.dur);
    bp.Q.value = opts.q || 4;
    src.connect(bp);
    env(bp, t, 0.004, opts.dur, opts.gain || 0.08);
    src.start(t); src.stop(t + opts.dur + 0.1);
  }

  /* ── rate limiter so hovers don't machine-gun ───────────── */
  function ok(minGap) {
    if (!enabled || !ready) return false;
    var n = performance.now();
    if (n - lastAt < (minGap || 45)) return false;
    lastAt = n;
    return true;
  }

  var SFX = {
    hover: function () {
      if (!ok(60)) return;
      tone({ f: 1180, f2: 1560, dur: 0.055, type: 'triangle', gain: 0.035, cut: 5200, a: 0.003 });
    },
    click: function () {
      if (!ok(30)) return;
      tone({ f: 480, f2: 1320, dur: 0.10, type: 'square', gain: 0.075, cut: 4200, cut2: 1400 });
      noise({ f: 2600, f2: 800, dur: 0.06, gain: 0.05 });
    },
    key: function () {
      if (!ok(28)) return;
      tone({ f: 2100 + Math.random() * 500, dur: 0.022, type: 'square', gain: 0.022, cut: 7000 });
    },
    enter: function () {
      if (!ok(60)) return;
      tone({ f: 300, f2: 900, dur: 0.14, type: 'sawtooth', gain: 0.05, cut: 2600, cut2: 700 });
    },
    ok: function () {
      [0, 4, 7, 12].forEach(function (s, i) {
        tone({ f: 440 * Math.pow(2, s / 12), dur: 0.13, type: 'triangle',
               gain: 0.055, delay: i * 0.055, cut: 4200 });
      });
    },
    err: function () {
      tone({ f: 150, f2: 78, dur: 0.2, type: 'sawtooth', gain: 0.09, cut: 1100 });
    },
    boot: function () {
      tone({ f: 60, f2: 1400, dur: 1.15, type: 'sawtooth', gain: 0.05, cut: 320, cut2: 7000, a: 0.35 });
      noise({ f: 200, f2: 5200, dur: 1.1, gain: 0.035, q: 1.2 });
    }
  };

  /* ── ambient drone: two detuned saws through a slow filter ── */
  function startAmbient() {
    if (!ready || ambient) return;
    var g = ctx.createGain(); g.gain.value = 0.0001;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 3;

    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.055;
    var lfoG = ctx.createGain(); lfoG.gain.value = 190;
    lfo.connect(lfoG); lfoG.connect(lp.frequency);

    [55, 82.5, 110.2, 164.8].forEach(function (f, i) {
      var o = ctx.createOscillator();
      o.type = i % 2 ? 'sawtooth' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 7;
      var og = ctx.createGain(); og.gain.value = 0.16 / (i + 1);
      o.connect(og); og.connect(lp);
      o.start();
    });
    lp.connect(g); g.connect(bus);
    lfo.start();
    g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 4);
    ambient = { g: g, lfo: lfo };
  }

  function stopAmbient() {
    if (!ambient) return;
    try {
      ambient.g.gain.cancelScheduledValues(ctx.currentTime);
      ambient.g.gain.setValueAtTime(Math.max(ambient.g.gain.value, 0.0002), ctx.currentTime);
      ambient.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    } catch (e) { /* noop */ }
    ambient = null;
  }

  SPIRTOQ.audio = {
    /** attach one-shot listeners for the whole doc */
    bind: function () {
      document.addEventListener('pointerover', function (e) {
        var t = e.target;
        if (t && t.closest && t.closest('a,button,[data-mag],input')) SFX.hover();
      }, { passive: true });

      document.addEventListener('pointerdown', function (e) {
        var t = e.target;
        if (t && t.closest && t.closest('a,button,label,[data-mag]')) SFX.click();
      }, { passive: true });

      document.addEventListener('keydown', function (e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) SFX.key();
        else if (e.key === 'Enter' || e.key === ' ') SFX.enter();
        else SFX.key();
      });
    },

    enable: function () {
      if (!init()) return false;
      if (ctx.state === 'suspended') ctx.resume();
      enabled = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0002), ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.75, ctx.currentTime + 0.25);
      startAmbient();
      SFX.ok();
      return true;
    },

    disable: function () {
      if (!ready) { enabled = false; return; }
      enabled = false;
      stopAmbient();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0002), ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    },

    toggle: function () {
      if (enabled) { this.disable(); return false; }
      return this.enable();
    },

    isOn: function () { return enabled; },
    sfx: SFX
  };

})(window);

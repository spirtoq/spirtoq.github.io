/* ═══════════════════════════════════════════════════════════════
   radio.js — live radio player
   Streams: ice2.somafm.com  (CORS: *)
   Now-playing: somafm.com/songs/{id}.json  (CORS: *)
   No API key. Audio only ever starts from a real user gesture.
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SPIRTOQ = global.SPIRTOQ || (global.SPIRTOQ = {});
  var doc = document, root = doc.documentElement;
  var $ = function (s) { return doc.querySelector(s); };

  var STATIONS = [
    { id: 'groovesalad', name: 'Groove Salad',  tag: 'ambient downtempo', mood: 'vibing' },
    { id: 'defcon',      name: 'DEF CON Radio', tag: 'for hacking',       mood: 'neon' },
    { id: 'vaporwaves',  name: 'Vaporwaves',    tag: 'vaporwave',         mood: 'retro' },
    { id: 'dronezone',   name: 'Drone Zone',    tag: 'deep ambient',      mood: 'null sector' }
  ];

  var BITRATE = 128;
  var streamOf = function (id) { return 'https://ice2.somafm.com/' + id + '-' + BITRATE + '-mp3'; };
  var songsOf  = function (id) { return 'https://somafm.com/songs/' + id + '.json'; };

  /* ── state ─────────────────────────────────────────────── */
  var el = {};
  var audio = null, ctx = null, srcNode = null, analyser = null, freq = null;
  var current = -1, playing = false, analyserOk = false, checked = false;
  var routed = false;
  var vol = 0.75, track = null, raf = 0, poll = 0, silentFor = 0;
  var peaks = [], contextInited = false;

  /* ═══════════ build the station switcher ═══════════ */
  function buildStations() {
    var wrap = el.stations;
    if (!wrap) return;
    wrap.innerHTML = '';
    STATIONS.forEach(function (s, i) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'stn';
      b.dataset.idx = String(i);
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML =
        '<span class="stn__no">' + (i + 1) + '</span>' +
        '<span class="stn__name">' + s.name + '</span>' +
        '<span class="stn__tag">' + s.tag + '</span>' +
        '<span class="stn__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
      b.addEventListener('click', function () { pick(i); });
      wrap.appendChild(b);
    });
  }

  function paintStations() {
    if (!el.stations) return;
    $$('.stn', el.stations).forEach(function (b, i) {
      var on = i === current;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  /* ═══════════ audio graph ═══════════ */
  function ensureCtx() {
    if (contextInited) return true;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    contextInited = true;
    return true;
  }

  /* Route the element through the graph. If the stream turns out to be
     CORS-tainted the graph outputs silence, so we must be able to undo it:
     the only escape is to swap in a fresh, un-routed <audio>. */
  function route() {
    if (routed) return;
    if (!ensureCtx()) return;
    try {
      srcNode = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.82;
      srcNode.connect(analyser);
      analyser.connect(ctx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
      routed = true;
    } catch (e) {
      analyser = null; srcNode = null;
    }
  }

  /* Replace the element to get audio back if the graph went silent. */
  function unroute() {
    var was = playing, at = audio ? audio.currentTime : 0;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    audio.pause();
    var fresh = doc.createElement('audio');
    fresh.preload = 'none';
    fresh.crossOrigin = 'anonymous';
    fresh.volume = vol;
    if (audio) audio.parentNode && audio.parentNode.replaceChild(fresh, audio);
    audio = fresh;
    analyser = null; srcNode = null; freq = null; contextInited = false; routed = false;
    if (was) { audio.currentTime = at; audio.play().catch(function () {}); }
  }

  function ctxResume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /* ═══════════ transport ═══════════ */
  function makeAudio() {
    var a = doc.createElement('audio');
    a.crossOrigin = 'anonymous';
    a.preload = 'none';
    a.volume = vol;
    a.addEventListener('playing', function () {
      playing = true; root.classList.add('onair'); paint();
    });
    a.addEventListener('pause', function () { playing = false; root.classList.remove('onair'); paint(); });
    a.addEventListener('waiting', function () { el.audio && el.audio.classList.add('is-buf'); });
    a.addEventListener('canplay', function () { el.audio && el.audio.classList.remove('is-buf'); });
    a.addEventListener('error', function () {
      playing = false; root.classList.remove('onair');
      if (el.state) { el.state.textContent = 'NO SIGNAL'; el.state.style.color = 'var(--a2)'; }
      if (el.hint) el.hint.textContent = 'поток недоступен · попробуй другую станцию';
      paint();
    });
    return a;
  }

  function pick(i, autoplay) {
    if (i === current && playing) { pause(); return; }
    if (!audio) { audio = makeAudio(); el.host && el.host.appendChild(audio); }
    current = i;
    var s = STATIONS[i];
    audio.src = streamOf(s.id);
    audio.load();
    track = null;
    paintStations();
    if (el.station) el.station.textContent = s.name;
    if (el.mood) el.mood.textContent = s.mood;
    if (el.hint) el.hint.textContent = 'нажми play · поток ' + BITRATE + ' kbps';
    if (el.state) { el.state.textContent = 'STANDBY'; el.state.style.color = ''; }
    setTrack(null);
    pollNow();
    if (autoplay !== false) play();
    SPIRTOQ.audio && SPIRTOQ.audio.sfx && SPIRTOQ.audio.sfx.enter();
  }

  function play() {
    /* the <audio> element is built by pick(); if the default station was
       selected at init() without going through pick(), it doesn't exist yet
       and play() would silently bail. Build it here. */
    if (!audio) pick(current < 0 ? 0 : current, false);
    if (!audio) return;
    if (ctx) ctxResume();
    if (!routed) route();
    var p = audio.play();
    if (p && p.catch) p.catch(function () {
      if (el.hint) el.hint.textContent = 'браузер заблокировал автозапуск · жми ещё раз';
    });
  }

  function pause() {
    if (audio) audio.pause();
    SPIRTOQ.audio && SPIRTOQ.audio.sfx && SPIRTOQ.audio.sfx.click();
  }

  function toggle() { (playing ? pause : play)(); }

  function setVolume(v) {
    vol = Math.max(0, Math.min(1, v));
    if (audio) audio.volume = vol;
    if (el.vol) el.vol.setAttribute('aria-valuenow', String(Math.round(vol * 100)));
    if (el.volFill) el.volFill.style.width = (vol * 100) + '%';
  }

  /* ═══════════ now-playing ═══════════ */
  function pollNow() {
    if (current < 0) return;
    var id = STATIONS[current].id;
    fetch(songsOf(id), { mode: 'cors' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var s = d && d.songs && d.songs[0];
        if (!s) return;
        /* the user may have switched stations while this was in flight */
        if (current < 0 || STATIONS[current].id !== id) return;
        setTrack(s);
      })
      .catch(function () { /* metadata is optional; the audio still plays */ });
  }

  function sinceLabel(uts) {
    if (!uts) return '';
    var d = new Date(parseInt(uts, 10) * 1000);
    var mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
    if (mins < 1) return 'только что';
    if (mins < 60) return mins + ' мин в эфире';
    var h = Math.floor(mins / 60);
    return h + ' ч ' + (mins % 60) + ' мин в эфире';
  }

  function setTrack(s) {
    track = s;
    if (!s) {
      if (el.track) el.track.textContent = 'тишина в эфире';
      if (el.artist) el.artist.textContent = '—';
      if (el.album) el.album.textContent = '—';
      if (el.since) el.since.textContent = '—';
      return;
    }
    if (el.track) el.track.textContent = s.title || '—';
    if (el.artist) el.artist.textContent = s.artist || '—';
    if (el.album) el.album.textContent = s.album || '';
    if (el.since) el.since.textContent = sinceLabel(s.date);
  }

  /* ═══════════ visualiser ═══════════ */
  function paint() {
    if (el.playIcon) el.playIcon.textContent = playing ? '❚❚' : '▶';
    if (el.playBtn) {
      el.playBtn.setAttribute('aria-label', playing ? 'Пауза' : 'Слушать');
      el.playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    }
    if (el.state && playing) el.state.textContent = 'ON AIR';
    else if (el.state && !playing && current >= 0) el.state.textContent = 'STANDBY';
  }

  function draw() {
    raf = requestAnimationFrame(draw);
    var c = el.spec;
    if (!c) return;
    var g = c.getContext('2d');
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var W = c.clientWidth, H = c.clientHeight;
    if (!W || !H) return;
    if (c.width !== (W * dpr | 0) || c.height !== (H * dpr | 0)) {
      c.width = W * dpr | 0; c.height = H * dpr | 0;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    var bars = 48, gap = 2, bw = (W - gap * (bars - 1)) / bars;
    var cs = getComputedStyle(root);
    var a1 = (cs.getPropertyValue('--a1') || '#00f3ff').trim();
    var a3 = (cs.getPropertyValue('--a3') || '#8b5cff').trim();

    /* is the graph actually seeing signal? */
    var peak = 0, silent = true;
    if (analyser && playing) {
      analyser.getByteFrequencyData(freq);
      for (var k = 0; k < freq.length; k++) if (freq[k] > peak) peak = freq[k];
      silent = peak < 3;
    }
    if (playing && !checked) {
      silentFor = silent ? silentFor + 1 : 0;
      if (silentFor > 40) {           /* ~0.7s of nothing */
        checked = true; analyserOk = false;
        if (el.hint) el.hint.textContent = 'визуализатор недоступен · звук идёт напрямую';
        unroute();
      } else if (!silent) { checked = true; analyserOk = true; }
    }

    for (var i = 0; i < bars; i++) {
      var v;
      if (analyserOk && analyser && playing) {
        var idx = Math.floor(Math.pow(i / bars, 1.55) * (freq.length * 0.62));
        v = (freq[idx] || 0) / 255;
        /* taper the top end so it doesn't look like a wall */
        v *= 1 - (i / bars) * 0.42;
      } else {
        /* idle / no analyser: a slow travelling swell, clearly decorative */
        var t = performance.now() / 1000;
        v = playing
          ? (0.10 + 0.06 * Math.sin(t * 2.1 + i * 0.42) + 0.04 * Math.sin(t * 3.7 - i * 0.21))
          : (0.028 + 0.012 * Math.sin(t * 0.9 + i * 0.3));
        v = Math.max(0, v);
      }
      v = Math.min(1, v);
      peaks[i] = peaks[i] || 0;
      peaks[i] = v > peaks[i] ? v : peaks[i] * 0.93;

      var h = Math.max(1.5, v * (H - 4));
      var x = i * (bw + gap);
      var y = H - h;
      var grad = g.createLinearGradient(0, y, 0, H);
      grad.addColorStop(0, a1);
      grad.addColorStop(1, a3);
      g.fillStyle = grad;
      g.globalAlpha = 0.30 + v * 0.7;
      g.fillRect(x, y, bw, h);

      /* peak hold */
      if (peaks[i] > 0.02) {
        var py = H - Math.max(2, peaks[i] * (H - 4));
        g.globalAlpha = 0.55;
        g.fillStyle = a1;
        g.fillRect(x, py - 1, bw, 1.5);
      }
    }
    g.globalAlpha = 1;

    /* baseline */
    g.fillStyle = a1;
    g.globalAlpha = 0.18;
    g.fillRect(0, H - 1, W, 1);
    g.globalAlpha = 1;
  }

  /* ═══════════ keyboard ═══════════ */
  function keys(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    var k = e.key.toLowerCase();
    if (k === 'p') { toggle(); e.preventDefault(); }
    else if (k === 'r') { if (current >= 0) pick(current, false); e.preventDefault(); }
    else if (k === '[' || k === ']') {
      var i = Math.max(0, Math.min(STATIONS.length - 1, current + (k === ']' ? 1 : -1)));
      pick(i); e.preventDefault();
    }
  }

  /* ═══════════ init ═══════════ */
  function init() {
    el.host = $('#radioAudio');
    el.spec = $('#spectrum');
    el.stations = $('#radioStations');
    el.playBtn = $('#radioPlay');
    el.playIcon = $('#radioPlayIcon');
    el.station = $('#radioStation');
    el.mood = $('#radioMood');
    el.track = $('#radioTrack');
    el.artist = $('#radioArtist');
    el.album = $('#radioAlbum');
    el.since = $('#radioSince');
    el.state = $('#radioState');
    el.hint = $('#radioHint');
    el.vol = $('#radioVol');
    el.volFill = $('#radioVolFill');
    if (!el.spec) return;

    buildStations();
    setVolume(vol);
    paint();
    if (el.playBtn) el.playBtn.addEventListener('click', toggle);
    if (el.vol) {
      el.vol.addEventListener('input', function () { setVolume(+el.vol.value / 100); });
    }

    /* default station shown, nothing playing yet */
    current = 0;
    paintStations();
    if (el.station) el.station.textContent = STATIONS[0].name;
    if (el.mood) el.mood.textContent = STATIONS[0].mood;
    if (el.hint) el.hint.textContent = 'нажми play · поток ' + BITRATE + ' kbps';
    setTrack(null);

    /* show what is on air right now, before anyone presses play */
    pollNow();

    draw();
    poll = setInterval(pollNow, 20000);
    doc.addEventListener('keydown', keys);
    root.classList.add('has-radio');
  }

  SPIRTOQ.radio = {
    init: init,
    play: play, pause: pause, toggle: toggle, pick: pick,
    setVolume: setVolume,
    stations: STATIONS,
    state: function () {
      return {
        playing: playing, index: current,
        station: current >= 0 ? STATIONS[current].name : null,
        title: track && track.title, artist: track && track.artist,
        album: track && track.album,
        analyser: analyserOk ? 'live' : 'decorative'
      };
    }
  };

})(window);

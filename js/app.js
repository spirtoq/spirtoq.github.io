/* ═══════════════════════════════════════════════════════════════
   app.js — orchestration
   boot · grain · cursor · magnet · tilt · reveal · clock · stats
   last.fm · goatcounter · themes · sfx · konami · easter eggs
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SPIRTOQ = global.SPIRTOQ || (global.SPIRTOQ = {});
  var doc = document, root = doc.documentElement;
  var $  = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TUNE = matchMedia('(pointer: fine)').matches;
  var coarse = matchMedia('(pointer: coarse)').matches;

  var LASTFM_KEY = '460cda35be2fbf4f28e8ea7a38580730';
  var LASTFM_USER = 'Spirtoq';
  var BOOT_SEEN = 'ns3-booted';

  var THEMES = ['cyan', 'amber', 'matrix', 'void', 'blood'];
  var LINKS = [
    { key: 'T', name: 'telegram', note: 'прямой канал связи', url: 'https://t.me/ExteraSpirtoq' },
    { key: 'L', name: 'last.fm',   note: 'scrobbling log',      url: 'https://Last.fm/user/Spirtoq' },
    { key: 'D', name: 'discord',   note: 'voice comms',         url: 'https://discord.gg/EkyNTSzQ' },
    { key: 'S', name: 'shikimori', note: 'media archive',       url: 'https://shikimori.one/SpirtoQ' }
  ];

  var S = {
    theme: 'cyan', sfx: false, god: false, booted: false,
    t0: performance.now(), visits: null, np: null, fps: 0,
    sessions: 1, firstRun: true
  };

  /* ═══════════ tiny utils ═══════════ */
  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
  function mmss(ms) {
    var s = Math.floor(ms / 1000);
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }
  function toast(msg, ms) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    el.classList.remove('out');
    clearTimeout(S._tt);
    S._tt = setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.hidden = true; }, 380);
    }, ms || 2200);
  }

  /* ═══════════ 01 · procedural film grain ═══════════ */
  (function grain() {
    try {
      var c = doc.createElement('canvas');
      c.width = c.height = 180;
      var x = c.getContext('2d');
      var d = x.createImageData(180, 180), p = d.data;
      for (var i = 0; i < p.length; i += 4) {
        var v = 118 + ((Math.random() * 74) | 0);
        p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255;
      }
      x.putImageData(d, 0, 0);
      root.style.setProperty('--grain-url', 'url(' + c.toDataURL('image/png') + ')');
    } catch (e) { /* noop */ }
  })();

  /* ═══════════ 02 · custom cursor ═══════════ */
  (function cursor() {
    if (!TUNE || coarse || RM) { root.dataset.cursor = 'off'; return; }
    var wrap = $('.cur'), dot = $('.cur__dot'), ring = $('.cur__ring'), lab = $('.cur__label');
    if (!wrap || !dot || !ring) return;
    var x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf = 0;

    addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
      dot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      if (!raf) raf = requestAnimationFrame(follow);
    }, { passive: true });

    function follow() {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      raf = (Math.abs(x - rx) + Math.abs(y - ry) > 0.4) ? requestAnimationFrame(follow) : 0;
    }

    doc.addEventListener('pointerover', function (e) {
      var hot = e.target.closest && e.target.closest('[data-mag],a,button,input,.card');
      root.classList.toggle('cur-hot', !!hot);
      if (hot && lab) {
        lab.textContent = hot.dataset ? (hot.dataset.label || '') : '';
      }
    }, { passive: true });

    doc.addEventListener('pointerdown', function () { ring.style.scale = '.82'; }, { passive: true });
    doc.addEventListener('pointerup', function () { ring.style.scale = ''; }, { passive: true });
    addEventListener('blur', function () { root.classList.remove('cur-hot'); });
    setTimeout(function () { root.classList.add('has-cursor'); }, 1200);
  })();

  /* ═══════════ 03 · magnetic pull ═══════════ */
  (function magnet() {
    if (coarse || RM) return;
    var targets = $$('[data-mag]');
    if (!targets.length) return;

    targets.forEach(function (el) {
      var strength = parseFloat(el.dataset.mag);
      if (isNaN(strength)) strength = el.classList.contains('card') ? 0.16 : 0.3;

      el.addEventListener('pointerenter', function () {
        if (el.dataset.label === undefined && el.classList.contains('card')) {
          var l = $('.cur__label'); if (l) l.textContent = 'open channel';
        }
      });

      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = 'translate(' + (dx * strength * 46) + 'px,' + (dy * strength * 46) + 'px)';
        if (SPIRTOQ.gl && SPIRTOQ.gl.energy) SPIRTOQ.gl.energy(0.55);
      }, { passive: true });

      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .55s cubic-bezier(.22,.61,.36,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 560);
      });
    });
  })();

  /* ═══════════ 04 · 3D tilt ═══════════ */
  (function tilt() {
    if (coarse || RM) return;
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transform = 'perspective(900px) rotateY(' + ((px - .5) * 13) + 'deg) rotateX(' +
                             (-(py - .5) * 13) + 'deg)';
      }, { passive: true });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .6s cubic-bezier(.22,.61,.36,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 620);
      });
    });

    /* card spotlight follows the pointer */
    $$('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        c.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      }, { passive: true });
    });
  })();

  /* ═══════════ 05 · hero title scan layer ═══════════ */
  (function titleScan() {
    var t = $('#heroTitle');
    if (!t) return;
    var s = doc.createElement('span');
    s.className = 'title__scan';
    t.appendChild(s);
  })();

  /* ═══════════ 06 · reveal on scroll ═══════════ */
  (function reveal() {
    var els = $$('.reveal');
    if (!('IntersectionObserver' in global) || RM) {
      els.forEach(function (e) { e.classList.add('in'); }); return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(function (e, i) {
      e.style.transitionDelay = Math.min(i % 4, 3) * 70 + 'ms';
      io.observe(e);
    });
  })();

  /* ═══════════ 07 · clock · uptime · stats ═══════════ */
  var clockEl, heroFreq;
  function tick() {
    var d = new Date();
    if (clockEl) {
      clockEl.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
      clockEl.setAttribute('datetime', d.toISOString());
    }
    var up = mmss(performance.now() - S.t0);
    var e = $('#statUp'); if (e) e.textContent = up;
    S.uptime = up;
  }

  function stats() {
    clockEl = $('#clock');
    var rtz = '';
    try { rtz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'; } catch (e) { rtz = 'local'; }
    S.tz = rtz;

    var off = -new Date().getTimezoneOffset() / 60;
    S.tzoff = (off >= 0 ? '+' : '') + pad(Math.floor(Math.abs(off))) + ':' + pad(Math.round((Math.abs(off) % 1) * 60));

    var cores = navigator.hardwareConcurrency || 0;
    S.cores = cores ? cores + ' × logical' : 'n/a';
    var e = $('#statCores'); if (e) e.textContent = cores || '?';

    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var net = conn ? (conn.effectiveType || conn.type || 'online') : (navigator.onLine ? 'online' : 'offline');
    S.net = String(net).toUpperCase();
    e = $('#statNet'); if (e) e.textContent = S.net;

    e = $('#statTz');
    if (e) { e.textContent = rtz.split('/').pop().replace(/_/g, ' '); e.title = rtz; }

    S.res = innerWidth + '×' + innerHeight + ' @' + (devicePixelRatio || 1) + 'x';
    S.mem = (performance.memory && performance.memory.jsHeapSizeLimit)
      ? Math.round(performance.memory.jsHeapSizeLimit / 1048576) + 'MB heap' : 'heap n/a';
    S.gpu = SPIRTOQ.gl && SPIRTOQ.gl.ready ? 'webgl2 · ' + (SPIRTOQ.gl.god ? 'OVERDRIVE' : 'nominal')
                                         : 'css fallback';

    heroFreq = $('#heroFreq');
    if (heroFreq) heroFreq.textContent = '0x' + ((Math.random() * 0xFFFF) | 0).toString(16).toUpperCase().padStart(4, '0');

    try { S.sessions = parseInt(sessionStorage.getItem('ns3-sessions') || '1', 10) || 1; } catch (e) {}
    sessionStorage.setItem('ns3-sessions', String(S.sessions + 1));
  }

  /* ═══════════ 08 · Last.fm now-playing ═══════════ */
  var npEls = {}, lastTrack = '';
  function npNodes() {
    npEls = {
      box: $('#np'), img: $('#npImg'), img2: $('#npImg2'), title: $('#npTitle'),
      artist: $('#npArtist'), album: $('#npAlbum'), state: $('#npState'),
      when: $('#npWhen'), link: $('#npLink')
    };
  }

  function ago(sec) {
    sec = Math.max(0, Math.round(sec));
    if (sec < 45) return 'только что';
    var m = Math.round(sec / 60);
    if (m < 60) return m + ' мин назад';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' ч назад';
    return Math.round(h / 24) + ' дн назад';
  }

  function renderTrack(t) {
    if (!t) return;
    var art = (t.image || []).slice().sort(function (a, b) { return (b.width || 0) - (a.width || 0); })[0];
    var url = art ? art['#text'] : '';
    var now = t['@attr'] && t['@attr'].nowplaying === 'true';
    var ts = t.date && t.date.uts ? parseInt(t.date.uts, 10) : 0;

    S.np = {
      title: t.name || '—',
      artist: t.artist ? t.artist['#text'] : '—',
      album: t.album ? t.album['#text'] : '',
      when: ts ? ago((Date.now() / 1000) - ts) : 'сейчас',
      uts: ts,
      now: now
    };

    if (npEls.title) npEls.title.textContent = S.np.title;
    if (npEls.artist) npEls.artist.textContent = S.np.artist;
    if (npEls.album)  npEls.album.textContent  = S.np.album || 'альбом неизвестен';
    if (npEls.when)   npEls.when.textContent   = S.np.when;
    if (npEls.state)  npEls.state.textContent  = now ? 'SCROBBING' : 'PAST SCROBBLE';
    if (npEls.link && t.url) npEls.link.href = t.url;
    if (url) {
      if (npEls.img)  { npEls.img.src = url;  npEls.img.alt  = S.np.title; }
      if (npEls.img2) npEls.img2.src = url;
    }
    if (npEls.box) {
      npEls.box.classList.toggle('live', now);
      root.classList.toggle('live', now);
    }
    lastTrack = S.np.title + '|' + S.np.artist;
  }

  function pollTrack() {
    var url = 'https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks' +
              '&user=' + encodeURIComponent(LASTFM_USER) +
              '&api_key=' + LASTFM_KEY + '&format=json&limit=1';
    var done = false;
    var to = setTimeout(function () { if (!done) fail(); }, 9000);

    function fail() {
      if (done) return; done = true; clearTimeout(to);
      if (npEls.title && /acquiring/i.test(npEls.title.textContent)) {
        npEls.title.textContent = 'сигнал потерян';
        npEls.artist.textContent = 'last.fm не отвечает';
        npEls.state.textContent = 'NO SIGNAL';
        npEls.state.style.color = 'var(--a2)';
      }
    }

    fetch(url, { mode: 'cors' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        done = true; clearTimeout(to);
        var t = d && d.recenttracks && d.recenttracks.track && d.recenttracks.track[0];
        if (t) renderTrack(t);
      })
      .catch(fail);
  }

  /* re-evaluate "x мин назад" locally, no refetch needed */
  setInterval(function () {
    if (!S.np || !S.np.uts || !npEls.when) return;
    S.np.when = ago((Date.now() / 1000) - S.np.uts);
    npEls.when.textContent = S.np.when;
  }, 30000);

  /* ═══════════ 09 · goatcounter ═══════════ */
  function visits() {
    var el = $('#visits');
    if (!el) return;
    var done = false;
    var to = setTimeout(function () { if (!done) { el.textContent = '—'; el.title = 'счётчик недоступен'; } }, 7000);
    fetch('https://spirtoq.goatcounter.com/counter/TOTAL.json')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        done = true; clearTimeout(to);
        S.visits = d.count || '0';
        el.textContent = S.visits;
        countUp(el, S.visits);
      })
      .catch(function () {
        clearTimeout(to);
        el.textContent = '—';
        el.title = 'счётчик недоступен (CORS/offline)';
      });
  }

  function countUp(el, target) {
    var n = parseInt(target, 10);
    if (isNaN(n) || RM || n > 1000000) return;
    var t0 = performance.now(), d = Math.min(1400, 400 + n * 3);
    (function step(now) {
      var p = Math.min(1, (now - t0) / d);
      el.textContent = String(Math.round(n * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ═══════════ 10 · themes ═══════════ */
  function setTheme(name, quiet) {
    if (THEMES.indexOf(name) === -1) return;
    S.theme = name;
    root.dataset.theme = name;
    try { localStorage.setItem('ns3-theme', name); } catch (e) {}
    var lbl = $('#themeState'); if (lbl) lbl.textContent = name.toUpperCase();
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#04060a');
    /* hand the palette to the shader after the CSS vars settle */
    setTimeout(function () {
      if (SPIRTOQ.gl && SPIRTOQ.gl.ready) SPIRTOQ.gl.setTheme(name);
    }, 30);
    if (!quiet) toast('theme · ' + name);
  }

  function nextTheme() {
    var i = THEMES.indexOf(S.theme);
    setTheme(THEMES[(i + 1) % THEMES.length]);
    SPIRTOQ.audio.sfx.ok();
  }

  /* ═══════════ 11 · god mode ═══════════ */
  function setGod(on, quiet) {
    S.god = !!on;
    root.classList.toggle('god', S.god);
    if (SPIRTOQ.gl && SPIRTOQ.gl.god) SPIRTOQ.gl.god(S.god);
    if (S.god) { root.classList.add('glitch'); setInterval(function () { root.classList.add('glitch'); }, 3000); }
    if (!quiet) toast(S.god ? 'god mode engaged' : 'god mode off');
  }
  function toggleGod() { setGod(!S.god, true); return S.god; }

  /* ═══════════ 12 · sfx toggle ═══════════ */
  function syncUI() {
    var b = $('#sfxBtn');
    root.dataset.sfx = S.sfx ? 'on' : 'off';
    if (b) b.setAttribute('aria-pressed', S.sfx ? 'true' : 'false');
    var l = $('#sfxState'); if (l) l.textContent = S.sfx ? 'ON' : 'OFF';
  }
  function toggleSfx() {
    S.sfx = SPIRTOQ.audio.toggle();
    syncUI();
    toast('sfx ' + (S.sfx ? 'on' : 'off'));
  }

  /* ═══════════ 13 · avatar easter egg ═══════════ */
  function initEject() {
    var box = $('#eject'), img = $('#ejectImg'), x = $('#ejectX'), t = $('#heroTitle');
    if (!box || !t) return;
    var loaded = false;

    function open() {
      if (!loaded) { img.src = 'avatar.gif'; loaded = true; }
      box.hidden = false;
      document.body.classList.add('is-locked');
      if (SPIRTOQ.gl && SPIRTOQ.gl.pulse) SPIRTOQ.gl.pulse();
      SPIRTOQ.audio.sfx.ok();
    }
    function close() {
      box.hidden = true;
      document.body.classList.remove('is-locked');
    }
    t.addEventListener('click', function (e) { e.preventDefault(); open(); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
    box.addEventListener('click', close);
    if (x) x.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
  }

  /* ═══════════ 14 · konami ═══════════ */
  function initKonami() {
    var K = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight',
             'ArrowLeft','ArrowRight','b','a'], i = 0;
    addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === K[i]) {
        i++;
        if (i === K.length) {
          i = 0;
          setGod(!S.god);
          SPIRTOQ.term.run('god');
          SPIRTOQ.term.focus();
          toast('↑↑↓↓←→←→BA — ' + (S.god ? 'god mode on' : 'god mode off'), 3200);
        }
      } else i = 0;
    });
  }

  /* ═══════════ 15 · scroll chrome ═══════════ */
  function initScroll() {
    var fill = $('#scrollFill'), top = $('#topbar');
    var dots = $$('#dots a'), navs = $$('.topnav a');
    var secs = ['hero', 'signal', 'uplink', 'shell'].map(function (id) { return doc.getElementById(id); });
    var raf = 0;

    addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var h = doc.documentElement.scrollHeight - innerHeight;
        var p = h > 0 ? scrollY / h : 0;
        if (fill) fill.style.width = (p * 100) + '%';
        if (top) top.classList.toggle('stuck', scrollY > 24);

        var mid = scrollY + innerHeight * 0.42, act = 0;
        secs.forEach(function (s, n) { if (s && s.offsetTop <= mid) act = n; });
        dots.forEach(function (d, n) { d.classList.toggle('on', n === act); });
        navs.forEach(function (a, n) { a.classList.toggle('on', n === act - 1); });
      });
    }, { passive: true });
  }

  /* ═══════════ 16 · shortcuts ═══════════ */
  function initKeys() {
    var uplink = doc.getElementById('uplink');

    addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      /* don't hijack single letters while the user is typing in the shell */
      if (SPIRTOQ.term && SPIRTOQ.term.isEngaged && SPIRTOQ.term.isEngaged()) return;

      var k = e.key.toLowerCase();

      /* link hotkeys only arm themselves while the uplink cards are on screen */
      if (uplink) {
        var r = uplink.getBoundingClientRect();
        var visible = r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.4;
        if (visible) {
          var L = LINKS.filter(function (l) { return l.key === e.key.toUpperCase(); })[0];
          if (L && e.key.length === 1) {
            e.preventDefault();
            toast(L.name + ' · открываю…', 1600);
            open(L.url);
            return;
          }
        }
      }

      switch (k) {
        case 'm': SPIRTOQ.term.run('matrix'); SPIRTOQ.term.focus(); break;
        case 'g': SPIRTOQ.term.run('god'); SPIRTOQ.term.focus(); break;
        case 'v': toggleSfx(); break;
        case 'c': nextTheme(); break;
        case 'f': toggleFull(); break;
        case '?': case '/':
          SPIRTOQ.term.run('help'); SPIRTOQ.term.focus(); break;
      }
    });

    function open(u) { global.open(u, '_blank', 'noopener'); }
    function toggleFull() {
      if (!doc.fullscreenElement) {
        var fn = doc.documentElement.requestFullscreen;
        if (fn) fn.call(doc.documentElement);
      } else if (doc.exitFullscreen) { doc.exitFullscreen(); }
    }
  }

  /* ═══════════ 17 · fps meter ═══════════ */
  function initFps() {
    var frames = 0, t = performance.now();
    (function loop() {
      frames++;
      var now = performance.now();
      if (now - t >= 1000) {
        S.fps = Math.round(frames * 1000 / (now - t));
        frames = 0; t = now;
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ═══════════ 18 · boot sequence ═══════════ */
  var BOOT_LINES = [
    ['<b>POST</b> ......................... ok', 120],
    ['<b>CPU</b> .......................... <u>' + (navigator.hardwareConcurrency || '?') + ' threads</u>', 90],
    ['<b>mount</b> /dev/shader2 ............ ok', 110],
    ['<b>mount</b> /dev/audio ............. ok', 100],
    ['<b>load</b> font:Syncopate ........... ok', 90],
    ['<b>load</b> font:SpaceGrotesk ........ ok', 80],
    ['<b>load</b> font:JetBrainsMono ....... ok', 80],
    ['<b>init</b> webgl2 context ........... <i>ok</i>', 140],
    ['<b>scan</b> last.fm 2.0 ............. <i>ok</i>', 150],
    ['<b>scan</b> goatcounter .............. <i>ok</i>', 110],
    ['<b>mount</b> /uplink/{t,l,d,s} ....... ok', 120],
    ['negotiating uplink .................. <i>ok</i>', 130],
    ['handshake <b>ACCEPTED</b>', 100],
    ['<b>GOD MODE</b> available — ↑↑↓↓←→←→BA', 260],
    ['entering null-sector .................', 200]
  ];

  function runBoot() {
    var box = $('#boot'), log = $('#bootLog'), bar = $('#bootBar'), pct = $('#bootPct');
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      box.classList.add('done');
      root.dataset.boot = '0';
      S.booted = true;
      try { sessionStorage.setItem(BOOT_SEEN, '1'); } catch (e) {}
      SPIRTOQ.audio.sfx.boot();
      setTimeout(function () { if (box && box.parentNode) box.hidden = true; }, 900);
    }
    function bail(e) { if (e) e.preventDefault(); finish(); }

    addEventListener('keydown', function once(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        removeEventListener('keydown', once); bail();
      }
    });
    box.addEventListener('click', bail);

    if (RM) { finish(); return; }

    var total = BOOT_LINES.reduce(function (a, l) { return a + l[1]; }, 0);
    var acc = 0, i = 0;

    (function step() {
      if (finished) return;
      if (i >= BOOT_LINES.length) { setTimeout(finish, 340); return; }
      var L = BOOT_LINES[i];
      log.insertAdjacentHTML('beforeend', L[0] + '\n');
      acc += L[1];
      var p = Math.min(99, Math.round(acc / total * 100));
      bar.style.width = p + '%';
      pct.textContent = p;
      i++;
      setTimeout(step, L[1]);
    })();
  }

  /* ═══════════ 19 · go ═══════════ */
  function start() {
    root.dataset.boot = '1';

    /* theme: ?theme= wins, then localStorage, then default */
    var saved = null;
    try {
      var q = (location.search.match(/[?&]theme=([a-z]+)/i) || [])[1];
      if (q) { saved = q.toLowerCase(); try { localStorage.setItem('ns3-theme', saved); } catch (e) {} }
      else saved = localStorage.getItem('ns3-theme');
    } catch (e) {}
    setTheme(THEMES.indexOf(saved) > -1 ? saved : 'cyan', true);

    npNodes();
    stats();
    tick();
    setInterval(tick, 1000);
    addEventListener('resize', function () { S.res = innerWidth + '×' + innerHeight; }, { passive: true });

    SPIRTOQ.audio.bind();
    SPIRTOQ.term.init();

    /* give the terminal a live view of the page */
    var T = SPIRTOQ.term;
    T.ctx.info = function () {
      var d = new Date();
      var ua = navigator.userAgent;
      var bm = ua.match(/(Firefox|Chrome|Safari|Edge|Opera|YaBrowser)\/?\s*([\d.]+)?/i);
      var km = ua.match(/(Firefox|Chrome|Safari|Edge|Opera)\/([\d.]+)/i);
      return {
        os: 'web', browser: bm ? bm[1] + (bm[2] ? ' ' + bm[2].split('.').slice(0, 2).join('.') : '') : 'unknown',
        host: location.host || 'localhost',
        kernel: 'js/' + (km ? km[1] : '?'),
        engine: 'v8', uptime: S.uptime || '0:00', sessions: S.sessions,
        theme: S.theme, cores: S.cores, mem: S.mem, gpu: S.gpu,
        res: S.res, tz: S.tz, tzoff: S.tzoff, net: S.net, visits: S.visits || '?',
        fps: S.fps, links: LINKS, themes: THEMES,
        time: pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()),
        date: d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        npTitle: S.np && S.np.title, npArtist: S.np && S.np.artist,
        npAlbum: S.np && S.np.album, npWhen: S.np && S.np.when,
        npState: S.np ? 'SYNCED' : 'IDLE'
      };
    };
    T.ctx.setTheme = setTheme;
    T.ctx.toggleGod = toggleGod;
    T.ctx.syncUI = syncUI;

    /* wire UI */
    var tb = $('#themeBtn'); if (tb) tb.addEventListener('click', nextTheme);
    var sb = $('#sfxBtn');   if (sb) sb.addEventListener('click', toggleSfx);
    syncUI();

    initScroll();
    initKeys();
    initKonami();
    initEject();
    initFps();

    /* data */
    pollTrack();
    setInterval(pollTrack, 20000);
    visits();

    /* boot */
    var seen = false;
    try { seen = sessionStorage.getItem(BOOT_SEEN) === '1'; } catch (e) {}
    if (seen || RM || location.search.indexOf('fast') > -1) {
      setTheme(S.theme, true);
      $('#boot').classList.add('done');
      $('#boot').hidden = true;
      root.dataset.boot = '0';
      S.booted = true;
    } else {
      runBoot();
    }

    addEventListener('load', function () {
      doc.body.setAttribute('data-ready', '1');
    });

    console.log(
      '%c SPIRTOQ // NULL SECTOR v3 ',
      'background:#00f3ff;color:#000;font:700 12px monospace;padding:3px 6px'
    );
    console.log('%cfps ' + S.fps + '  ·  webgl2 ' + (SPIRTOQ.gl.ready ? 'on' : 'off') +
                '  ·  terminal: type "help"', 'color:#5d7186');
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();

})(window);

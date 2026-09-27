/* ═══════════════════════════════════════════════════════════════
   terminal.js — a real, working command interpreter.
   Providers are injected by app.js through SPIRTOQ.ctx.
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SPIRTOQ = global.SPIRTOQ || (global.SPIRTOQ = {});

  var out, form, input, badge, hints, history = [], hIdx = -1, ready = false;
  var engaged = false;
  var SPIRTOQctx = {};

  var BANNER = [
    ' ███ ██   ██   ██ ██  ██ ████████ ██████  ██████ ',
    ' ███ ██   ██ ██   ██  ██ ██      ██   ██ ██      ',
    ' ███ ██   ██ ████  ██  ██ ███████ ██████  ██  ███ ',
    '  ██ ██   ██ ██ ██ ██  ██      ██   ██ ██   ██ ██  █ ',
    '  ██  ██████  ██  ████  ████████ ██   ██  ██████  '
  ].join('\n');

  var EMBLEM = [
    '          ◆',
    '        ◆   ◆',
    '      ◆   ◇   ◆',
    '    ◆   ◇   ◇   ◆',
    '      ◆   ◇   ◆',
    '        ◆   ◆',
    '          ◆'
  ].join('\n');

  /* Реальная машина, на которой это всё живёт. Снято с неё же:
     `fastfetch` на CachyOS, октябрь 2026. Не выдумано. */
  var MACHINE = {
    os:     'CachyOS x86_64 (rolling)',
    board:  'B550M AORUS ELITE',
    kernel: 'Linux 7.2.7-1-cachyos',
    shell:  'zsh 5.9.2',
    wm:     'Hyprland 0.56.2 · Wayland',
    cpu:    'AMD Ryzen 5 5600 · 6 ядер / 12 потоков @ 4.47 ГГц',
    gpu:    'AMD Radeon RX 7600',
    ram:    '31.3 GiB',
    disk:   '932 ГБ · 46% занято',
    tools:  'LMMS · Ren’Py · osu!lazer · LM Studio'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function c(t, cls) { return '<span class="tl--' + cls + '">' + t + '</span>'; }
  function br() { return '\n'; }

  /* ── output primitives ─────────────────────────────────── */
  function write(text, cls) {
    var line = document.createElement('div');
    line.className = 'tl' + (cls ? ' tl--' + cls : '');
    line.textContent = text;
    out.appendChild(line);
    return line;
  }
  function html(s) {
    var line = document.createElement('div');
    line.className = 'tl';
    line.innerHTML = s;
    out.appendChild(line);
    return line;
  }
  function banner() {
    var line = document.createElement('div');
    line.className = 'tl tl--ok';
    line.textContent = BANNER;
    line.style.textShadow = '0 0 14px currentColor';
    out.appendChild(line);
  }
  function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }
  function rule(ch) { write((ch || '─').repeat(58), 'dim'); }

  function busy(on) {
    if (!badge) return;
    badge.textContent = on ? 'busy' : 'idle';
    badge.classList.toggle('busy', !!on);
  }

  function scroll() { out.scrollTop = out.scrollHeight; }

  /* ── command table ─────────────────────────────────────── */
  var CMDS = {

    help: function () {
      html(c('доступные команды', 'hi'));
      write('');
      var rows = [
        ['fastfetch',  'железо и софт на машине SPIRTOQ'],
        ['links',      'каналы связи'],
        ['help, ?',    'этот список'],
        ['clear, cls', 'очистить экран']
      ];
      var s = '<table>';
      rows.forEach(function (r) { s += '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; });
      html(s + '</table>');
      write('');
      write('имена команд нечувствительны к регистру · ↑↓ — история, Tab — дополнение', 'dim');
    },

    fastfetch: function () {
      var k = SPIRTOQctx.info ? SPIRTOQctx.info() : {};
      var M = MACHINE;
      var L = function (s, cl) { return '<span class="tl--' + (cl || 'out') + '">' + esc(s) + '</span>'; };
      var KEY = function (n, w) { return L(pad(n, w), 'hi'); };

      var rows = [
        ['spirtoq@null-sector', null, 'ok'],
        ['─────────────────────', null, 'dim'],
        ['OS',        M.os,     'out'],
        ['BOARD',     M.board,  'out'],
        ['KERNEL',    M.kernel, 'out'],
        ['SHELL',     M.shell,  'out'],
        ['WM',        M.wm,     'out'],
        ['CPU',       M.cpu,    'out'],
        ['GPU',       M.gpu,    'out'],
        ['RAM',       M.ram,    'out'],
        ['DISK',      M.disk,   'out'],
        ['TOOLS',     M.tools,  'out'],
        [null,        null,     null],
        ['ТВОЁ ОКНО', k.res || '?', 'dim'],
        ['СЕССИЯ',    k.uptime ? k.uptime + ' на сайте' : 'только что', 'dim'],
        ['ТЕМА',      k.theme || 'cyan', 'dim']
      ];

      var dat = rows.map(function (r) {
        if (!r[0]) return L('', 'dim');
        return r[1] === null ? L(r[0], r[2]) : KEY(r[0], 10) + L(r[1], r[2]);
      }).join('\n');

      var art = EMBLEM.split('\n'), lines = dat.split('\n');
      var n = Math.max(art.length, lines.length);
      var buf = '';
      for (var i = 0; i < n; i++) {
        buf += '<span class="tl--ok">' + esc(pad(art[i] || '', 17)) + '</span>  ' +
               (lines[i] || '') + '\n';
      }
      buf += '<span class="tl--ok">' + esc(pad('◆', 17)) + '</span>  ' +
             L('это не твой компьютер. это комп SPIRTOQ.', 'dim');
      html(buf);
      var swatches = ['--a1', '--a2', '--a3', '--a2', '--a1'];
      var sw = '<div style="height:9px;display:flex;gap:2px;margin:8px 0 4px">';
      swatches.forEach(function (v) {
        sw += '<i style="flex:1;background:var(' + v + ');box-shadow:0 0 10px var(' + v + ')"></i>';
      });
      html(sw + '</div>');
      SPIRTOQ.audio.sfx.ok();
    },
    neofetch: function () { CMDS.fastfetch(); },

    links: function () {
      var k = SPIRTOQctx.info ? SPIRTOQctx.info() : {};
      var L = k.links || [];
      var s = '<table>';
      L.forEach(function (l) {
        var what = l.copy
          ? '<span class="tl--ok">' + esc(l.copy) + '</span> <span class="tl--dim">(копируется)</span>'
          : '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.name) + '</a>';
        s += '<tr><td>' + esc(pad(l.key, 3)) + '</td><td>' + what + '</td>' +
             '<td class="tl--dim">' + esc(l.note) + '</td></tr>';
      });
      html(s + '</table>');
      write('горячие клавиши T · D · O · S работают, пока карточки на экране', 'dim');
    },

    clear: function () { out.innerHTML = ''; },
    cls: function () { CMDS.clear(); }
  };

  /* aliases */
  CMDS['?'] = CMDS.help;

  /* ── run one command line ──────────────────────────────── */
  function run(raw) {
    var line = String(raw || '');
    html(c('spirtoq@ns', 'ok') + c(':', 'err') + c('~$', 'ok') + ' ' + esc(line));
    if (!line.trim()) { scroll(); return; }

    history.push(line);
    hIdx = history.length;

    var parts = line.trim().split(/\s+/);
    var name = parts[0].toLowerCase();
    var rest = parts.slice(1).join(' ').trim();

    if (name === 'rm' || name === 'del' || name === 'drop') {
      write('«' + esc(name) + '» отключён. здесь ничего не удаляется.', 'err');
      SPIRTOQ.audio.sfx.err(); scroll(); return;
    }

    var fn = CMDS[name];
    if (!fn) {
      write('nullsh: ' + name + ': command not found', 'err');
      write('набери help — список команд', 'dim');
      SPIRTOQ.audio.sfx.err();
      scroll();
      return;
    }

    try {
      fn(rest);
    } catch (e) {
      write('ошибка выполнения: ' + (e && e.message ? e.message : e), 'err');
      SPIRTOQ.audio.sfx.err();
    }
    scroll();
  }

  /* ── init ──────────────────────────────────────────────── */
  function init() {
    if (ready) return;
    out = document.getElementById('termOut');
    form = document.getElementById('termForm');
    input = document.getElementById('termIn');
    badge = document.getElementById('termBadge');
    hints = document.getElementById('termHints');
    if (!out || !form || !input) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      engaged = true;
      var v = input.value;
      input.value = '';
      busy(true);
      run(v);
      setTimeout(function () { busy(false); }, 260);
      out.focus({ preventScroll: true });
    });

    input.addEventListener('focus', function () { engaged = true; });
    input.addEventListener('pointerdown', function () { engaged = true; });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!history.length) return;
        hIdx = Math.max(0, hIdx - 1);
        input.value = history[hIdx] || '';
        requestAnimationFrame(function () { input.setSelectionRange(999, 999); });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        hIdx = Math.min(history.length, hIdx + 1);
        input.value = history[hIdx] || '';
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (input.value) input.value = ''; else CMDS.clear();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        var v = input.value.trim().toLowerCase();
        if (!v) return;
        var m = Object.keys(CMDS).filter(function (k) { return k.indexOf(v) === 0; });
        if (m.length === 1) { input.value = m[0] + ' '; }
        else if (m.length > 1) {
          write('  ' + m.join('   '), 'dim'); scroll();
        }
      }
    });

    out.addEventListener('click', function () { engaged = true; input.focus({ preventScroll: true }); });

    /* leave the terminal when clicking anywhere else on the page */
    document.addEventListener('pointerdown', function (e) {
      var sec = document.getElementById('shell');
      if (sec && !sec.contains(e.target)) engaged = false;
    }, true);

    if (hints) {
      hints.addEventListener('click', function (e) {
        var s = e.target.closest('span');
        if (!s) return;
        input.value = s.textContent;
        input.focus();
      });
    }

    ready = true;

    /* first paint */
    write('nullsh 3.0.1 (null-sector) — tty1', 'hi');
    write('набери ' + 'help' + ' для списка команд. ↑↓ — история, Tab — автодополнение.', 'dim');
    write('');
    banner();
    write('');
    write('последний вход: сегодня · язык браузера: ' + (navigator.language || 'не определён'), 'dim');
    SPIRTOQ.audio.sfx.ok();
  }

  SPIRTOQ.term = {
    init: init,
    run: run,
    print: write,
    printHTML: html,
    banner: banner,
    focus: function () { engaged = true; if (input) input.focus({ preventScroll: true }); },
    isEngaged: function () { return engaged; },
    ctx: SPIRTOQctx
  };

  /* global keyboard shortcuts for the terminal section */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (!ready || engaged) return;
    var sec = document.getElementById('shell');
    if (!sec) return;
    var r = sec.getBoundingClientRect();
    if (r.top > innerHeight * 0.7 || r.bottom < innerHeight * 0.2) return;
    if (e.key.length === 1 && /\S/.test(e.key)) {
      engaged = true;
      input.value += e.key;
      input.focus({ preventScroll: true });
    }
  });

})(window);

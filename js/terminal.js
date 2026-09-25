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
        ['help, ?',       'этот список'],
        ['neofetch',      'сводка по системе'],
        ['whoami',        'кто ты'],
        ['ls / dir',      'содержимое ноды'],
        ['cat <file>',    'прочитать файл'],
        ['links',         'открытые каналы'],
        ['now / np',      'что в эфире прямо сейчас'],
        ['fm / radio',    'станции: fm 2 · fm dronezone'],
        ['nick',          'скопировать ник discord'],
        ['play <url>',    'проверить любой URL'],
        ['ping',          'задержка до шлюза'],
        ['time / date',   'локальное время'],
        ['uptime',        'аптайм сессии'],
        ['theme [name]',  'сменить палитру'],
        ['sfx on|off',    'звук интерфейса'],
        ['matrix',        'дождь матриц'],
        ['god / konami',  'режим бога'],
        ['banner',        'логотип'],
        ['sudo <x>',      'попробуй угадать'],
        ['curl <x>',      'ясно'],
        ['history',       'история команд'],
        ['clear / cls',   'очистить экран']
      ];
      var s = '<table>';
      rows.forEach(function (r) { s += '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; });
      html(s + '</table>');
      write('');
      write('подсказка: команды чувствительны к регистру не на 100% · ESC — очистить ввод', 'dim');
    },

    neofetch: function () {
      var k = SPIRTOQctx.info ? SPIRTOQctx.info() : {};
      var L = (s, cl) => '<span class="tl--' + (cl || 'out') + '">' + esc(s) + '</span>';
      var left = EMBLEM.split('\n').map(function (l) { return pad(l, 17); }).join('\n');

      var info = [
        L('spirtoq@null-sector', 'ok'),
        L('─────────────────────', 'dim'),
        L('OS', 'hi') + L('        ' + (k.os || 'web') + ' / ' + (k.browser || '?'), 'out'),
        L('HOST', 'hi') + L('     ' + (k.host || 'github-pages'), 'out'),
        L('KERNEL', 'hi') + L('  ' + (k.kernel || 'js/' + (k.engine || '?')), 'out'),
        L('UPTIME', 'hi') + L('  ' + (k.uptime || '?'), 'out'),
        L('SHELL', 'hi') + L('   nullsh 3.0', 'out'),
        L('THEME', 'hi') + L('   ' + (k.theme || 'cyan'), 'out'),
        L('CPU', 'hi') + L('      ' + (k.cores || '?') + ' threads @ ' + (k.mem || '?'), 'out'),
        L('GPU', 'hi') + L('      ' + (k.gpu || 'webgl2'), 'out'),
        L('RES', 'hi') + L('      ' + (k.res || '?'), 'out'),
        L('LOCALE', 'hi') + L('  ' + (k.tz || '?'), 'out'),
        L('NET', 'hi') + L('      ' + (k.net || '?'), 'out'),
        L('VISITS', 'hi') + L('   ' + (k.visits || '?'), 'out')
      ].join('\n');

      var art = left.split('\n'), dat = info.split('\n');
      var n = Math.max(art.length, dat.length);
      var buf = '';
      for (var i = 0; i < n; i++) {
        buf += '<span class="tl--ok">' + esc(art[i] || '') + '</span>  ' + (dat[i] || '') + '\n';
      }
      buf += '<span class="tl--ok">' + esc(pad('◆', 17)) + '</span>  ' +
             '<span class="tl--dim">' + esc(pad(EMBLEM.split('\n')[6], 17)) + '</span>  ' +
             '<span class="tl--out">хост открыт. будь аккуратен.</span>';
      html(buf);
      var swatches = ['--a1', '--a2', '--a3', '--a2', '--a1'];
      var sw = '<div style="height:9px;display:flex;gap:2px;margin:8px 0 4px">';
      swatches.forEach(function (v) {
        sw += '<i style="flex:1;background:var(' + v + ');box-shadow:0 0 10px var(' + v + ')"></i>';
      });
      html(sw + '</div>');
    },

    whoami: function () {
      var k = SPIRTOQctx.info ? SPIRTOQctx.info() : {};
      write('guest@null-sector — аутентификация не требуется.', 'out');
      write('ты — это то, что читает эти строки. и ты же нажал Enter.', 'dim');
      write('владелец ноды: SPIRTOQ · ' + (k.uptime || '?') + ' сессии', 'ok');
    },

    ls: function () {
      var files = [
        ['drwxr-xr-x', 'about.txt', 'dir'],
        ['-rw-r--r--', 'boot.log', 'file'],
        ['-rw-r--r--', 'index.html', 'file'],
        ['drwxr-xr-x', 'secrets', 'dir'],
        ['-rw-rw-rw-', 'signal.log', 'file'],
        ['-rwxr-xr-x', 'nullsh', 'bin']
      ];
      var s = '<table>';
      files.forEach(function (f) {
        s += '<tr><td>' + esc(f[0]) + '</td><td>' + esc(f[1]) + '</td>' +
             '<td class="tl--dim">' + (f[2] === 'dir' ? '→' : size(f[1])) + '</td></tr>';
      });
      html(s + '</table>');
      write('cat about.txt — начни отсюда', 'dim');
      function size(n) {
        return ({ 'index.html': '11.4 KB', 'boot.log': '2.1 KB', 'signal.log': '4.7 KB' })[n] || '—';
      }
    },

    cat: function (arg) {
      var files = {
        'about.txt': function () {
          write('SPIRTOQ — человек из глубины веба.', 'out');
          write('Собираю частоты, слушаю музыку и иногда пишу шейдеры.', 'out');
          write('Эта страница — личный передатчик в пустоту. Она живая:', 'dim');
          write('  · фон рисуется шейдером в реальном времени', 'ok');
          write('  · радио играет прямо в браузере, 4 станции', 'ok');
          write('  · счётчик считает, сколько нас тут было', 'ok');
        },
        'boot.log': function () {
          var lines = [
            '00.000  POST .................. ok',
            '00.104  mount /dev/shader2 .... ok',
            '00.212  load font:Syncopate .... ok',
            '00.488  mount /dev/icecast2 ... ok',
            '00.771  negotiate uplink ...... ok',
            '01.130  handshake ............. ok',
            '01.402  <b>GOD MODE AVAILABLE</b>  (konami)',
            '01.900  ready.'
          ];
          lines.forEach(function (l) { write(l.replace(/<b>|<\/b>/g, ''), 'dim'); });
        },
        'secrets': function () {
          write('в этой папке 3 файла. все три открыты.', 'dim');
          write('cat secrets/one · two · three', 'ok');
        },
        'secrets/one': function () {
          write('ты кликнул по слову SPIRTOQ. и закрыл. и открыл снова.', 'out');
          write('а потом набрал matrix, потом god.', 'ok');
          write('у каждого есть своя комбинация. у тебя тоже будет.', 'dim');
        },
        'secrets/two': function () {
          write('если ты это читаешь — значит рендер не упал.', 'out');
          write('fps считается в консоли. там тихо.', 'dim');
        },
        'secrets/three': function () {
          write('радио тянется с soma.fm по прямой ссылке, без ключа.', 'out');
          write('и визуализатор честный: если поток не даёт звук — он это скажет.', 'ok');
          write('если ты читаешь это, ты уже видел консоль. ты один из тех.', 'dim');
        },
        'index.html': function () {
          write('11 350 байт. весь сайт в одном файле.', 'out');
          write('старая версия. новая разбита на файлы.', 'dim');
          write('grep -r "EXTRACT_ALL" .', 'ok');
        },
        'signal.log': function () {
          var k = SPIRTOQctx.info ? SPIRTOQctx.info() : {};
          var r = k.radio || {};
          write('эфир:', 'dim');
          write((r.title || 'тишина') + ' — ' + (r.artist || '?'), 'ok');
          write('станция: ' + (r.station || '?') + ' · ' + (r.playing ? 'играет' : 'пауза'), 'out');
          write('канал: ice2.somafm.com · метаданные somafm.com', 'dim');
        }
      };
      var f = (arg || '').toLowerCase();
      if (!f) { write('cat: нужно имя файла · ls покажет список', 'err'); SPIRTOQ.audio.sfx.err(); return; }
      if (files[f]) { files[f](); return; }
      write('cat: ' + f + ': нет такого файла', 'err');
      SPIRTOQ.audio.sfx.err();
    },

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

    nick: function () {
      var k = SPIRTOQctx.info ? SPIRTOQctx.info() : {};
      var d = (k.links || []).filter(function (l) { return l.copy; })[0];
      if (!d) { write('ника нет', 'err'); return; }
      write('ник в discord: ' + d.copy, 'ok');
      if (SPIRTOQctx.copyNick) {
        SPIRTOQctx.copyNick(d);
        write('скопировано. вставь в поиск людей в дискорде.', 'dim');
      } else {
        write('скопируй вручную — ' + d.copy, 'dim');
      }
    },

    now: function () {
      var k = SPIRTOQctx.info ? SPIRTOQctx.info() : {};
      var r = k.radio || {};
      if (!r.station) { write('радио не инициализировано', 'err'); return; }
      write((r.playing ? '▶ ' : '❚❚ ') + r.station + '  [' + (r.playing ? 'ON AIR' : 'STANDBY') + ']',
            r.playing ? 'ok' : 'dim');
      write('  ' + (r.title || 'тишина в эфире'), r.title ? 'out' : 'dim');
      if (r.artist) write('  ' + r.artist, 'out');
      if (r.album) write('  ' + r.album, 'dim');
      write('  визуализатор: ' + (r.analyser === 'live' ? 'реагирует на звук' : 'декоративный'),
            r.analyser === 'live' ? 'hi' : 'dim');
    },
    np: function () { CMDS.now(); },

    radio: function (arg) {
      var R = SPIRTOQ.radio;
      if (!R) { write('радио недоступно', 'err'); return; }
      var st = R.stations;
      if (!arg) {
        write('доступные станции (номер или имя):', 'hi');
        st.forEach(function (s, i) {
          write('  ' + pad(i + 1, 3) + s.id.padEnd(14) + pad(s.name, 16) + s.tag, 'out');
        });
        write(' fm <n|name> — переключить и включить', 'dim');
        write(' fm stop / fm play', 'dim');
        return;
      }
      var a = String(arg).toLowerCase();
      if (a === 'stop' || a === 'off') { R.pause(); write('пауза', 'dim'); return; }
      if (a === 'play' || a === 'on') { R.play(); write('воспроизведение', 'ok'); return; }

      var idx = /^\d+$/.test(a) ? +a - 1
              : st.map(function (s) { return s.id; }).indexOf(a);
      if (idx < 0 || idx >= st.length) { write('fm: станция «' + arg + '» не найдена', 'err'); return; }
      R.pick(idx);
      write('→ ' + st[idx].name + ' · ' + st[idx].tag, 'ok');
    },
    fm: function (a) { CMDS.radio(a); },
    stations: function () { CMDS.radio(''); },

    play: function (arg) {
      if (!arg) { write('play: укажи url', 'err'); return; }
      var u = /^https?:\/\//i.test(arg) ? arg : 'https://' + arg;
      write('проверяю ' + u + ' …', 'dim');
      setTimeout(function () {
        write('очевидно я ничего не открою из браузера.', 'out');
        write('но адрес выглядит правдоподобно. скопируй руками.', 'dim');
        SPIRTOQ.audio.sfx.ok();
      }, 620);
    },

    ping: function () {
      var t0 = performance.now();
      fetch(location.href, { method: 'HEAD', cache: 'no-store' })
        .catch(function () {})
        .then(function () {
          var ms = Math.max(1, Math.round(performance.now() - t0));
          write('64 bytes from null-sector: icmp_seq=0 ttl=54 time=' + ms + 'ms', 'ok');
          if (ms > 600) write('заметно медленно. где-то сервер устал.', 'dim');
        });
    },

    time: function () {
      var k = SPIRTOQctx.info ? SPIRTOQctx.info() : {};
      write(k.time || '--:--:--', 'ok');
      write(k.date || '', 'dim');
      write('зона: ' + (k.tz || '?') + ' · смещение ' + (k.tzoff || '?'), 'dim');
    },
    date: function () { CMDS.time(); },

    uptime: function () {
      var k = SPIRTOQctx.info ? SPIRTOQctx.info() : {};
      write('up ' + (k.uptime || '?') + ' · сессия ' + (k.sessions || '?'), 'ok');
      write(k.res || '', 'dim');
    },

    theme: function (arg) {
      var k = SPIRTOQctx.info ? SPIRTOQctx.info() : {};
      var names = k.themes || ['cyan', 'amber', 'matrix', 'void', 'blood'];
      if (!arg) {
        write('доступные темы: ' + names.join(' · '), 'out');
        write('текущая: ' + (k.theme || 'cyan') + '  ·  без аргумента — следующая по кругу', 'dim');
        return;
      }
      var n = String(arg).toLowerCase();
      if (names.indexOf(n) === -1) { write('theme: нет темы "' + n + '"', 'err'); SPIRTOQ.audio.sfx.err(); return; }
      SPIRTOQctx.setTheme(n);
      write('палитра → ' + n, 'ok');
      SPIRTOQ.audio.sfx.ok();
    },

    sfx: function (arg) {
      var on = arg === 'on' || arg === '1';
      var off = arg === 'off' || arg === '0';
      if (!arg) { write('sfx: ' + (SPIRTOQ.audio.isOn() ? 'on' : 'off') + ' · переключить: sfx on|off', 'out'); return; }
      if (on && !SPIRTOQ.audio.isOn()) { SPIRTOQ.audio.enable(); write('звук включён', 'ok'); }
      else if (off) { SPIRTOQ.audio.disable(); write('звук выключен', 'dim'); }
      else { write('sfx: используй on или off', 'err'); return; }
      if (SPIRTOQctx.syncUI) SPIRTOQctx.syncUI();
    },

    matrix: function () {
      var on = SPIRTOQ.rain.toggle();
      write(on ? 'дождь матриц включён. реальность подождёт.' : 'дождь матриц выключен', on ? 'ok' : 'dim');
      SPIRTOQ.audio.sfx.ok();
    },

    god: function () {
      var on = SPIRTOQctx.toggleGod ? SPIRTOQctx.toggleGod() : false;
      write(on ? 'GOD MODE ENGAGED — решётка в шоке' : 'godot mode выключен', on ? 'ok' : 'dim');
      SPIRTOQ.audio.sfx.ok();
    },
    konami: function () { CMDS.god(); },

    banner: function () { banner(); },

    cowsay: function (arg) {
      var t = arg || 'мы всё ещё на частоте';
      var top = ' ' + '─'.repeat(t.length + 2) + ' ';
      write(' ' + top);
      write('< ' + t + ' >', 'ok');
      write(' ' + '─'.repeat(t.length + 2));
      var r = '          \\   ^__^';
      write('           \\  (oo)\\_______');
      write('              (__)\\       )\\/\\');
      write('                  ||----w |');
      write('                  ||     ||', 'dim');
    },

    sudo: function (arg) {
      if (!arg) { write('usage: sudo <команда>', 'err'); return; }
      write('пользователь spirtoq не в списке sudoers.', 'err');
      write('впрочем, если серьёзно — ты и так уже root этой страницы.', 'out');
      SPIRTOQ.audio.sfx.err();
    },

    curl: function (arg) {
      if (!arg) { write('curl: укажи url', 'err'); return; }
      write('$ curl ' + arg, 'dim');
      write('ничего не выведет. это же браузер.', 'out');
      write('но адрес запомнил.', 'dim');
    },

    history: function () {
      if (!history.length) { write('история пуста', 'dim'); return; }
      history.forEach(function (h, i) { write(pad(i + 1, 4) + h, 'dim'); });
    },

    man: function (arg) {
      if (!arg) { write('man: что читаем?', 'err'); return; }
      var c2 = CMDS[String(arg).toLowerCase()];
      if (!c2) { write('no manual entry for ' + arg, 'err'); return; }
      write('это интерактивная команда, а не man page.', 'out');
      write('просто набери: ' + arg, 'ok');
    },

    grep: function (arg) {
      if (!arg) { write('grep: нужен паттерн', 'err'); return; }
      write('Searching ' + arg + ' ...', 'dim');
      var k = SPIRTOQctx.info ? SPIRTOQctx.info() : {};
      var hay = ['index.html', 'css/main.css', 'js/gl.js', 'js/audio.js', 'js/radio.js',
                 'js/terminal.js', 'js/app.js']
        .join('\n') + '\n' + ((k.radio && k.radio.artist) || '') + '\n' + ((k.radio && k.radio.title) || '');
      var re = new RegExp(String(arg).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      var hits = hay.split('\n').filter(function (l) { return re.test(l); });
      if (!hits.length) { write('0 совпадений. чисто.', 'dim'); return; }
      hits.forEach(function (l) { write(esc(l).replace(new RegExp('(' + re.source + ')', 'ig'), '<span class="tl--ok">$1</span>'), 'out'); });
    },

    clear: function () { out.innerHTML = ''; },
    cls: function () { CMDS.clear(); },
    exit: function () {
      write('выход не предусмотрен. ты в браузере, а не в ssh.', 'err');
      input.focus();
    }
  };

  /* aliases */
  CMDS['?'] = CMDS.help;
  CMDS.dir = CMDS.ls;
  CMDS['clear!'] = CMDS.clear;
  CMDS.fetch = CMDS.play;

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
    write('последний вход: сегодня, с ' + (navigator.language || 'этого устройства'), 'dim');
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

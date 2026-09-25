# SPIRTOQ // NULL SECTOR

Personal transmission node. Static site, no build step, no dependencies —
just GitHub Pages serving plain files.

## Structure

```
index.html          markup + inline analytics
404.html            themed error page
css/main.css        everything visual (~33 KB)
js/gl.js            raw WebGL2 field renderer + matrix rain
js/audio.js         synthesised UI sound + ambient drone (Web Audio, no files)
js/terminal.js      command interpreter
js/app.js           orchestration: boot, cursor, magnet, tilt, last.fm, themes
favicon.svg         inline-able mark
site.webmanifest    PWA manifest
avatar.gif          easter egg, lazy-loaded on click
```

## Features

- **WebGL2 background** — hand-written fragment shader (fbm nebula, hex lattice,
  cursor lens distortion, interaction energy). No three.js. Falls back to a CSS
  gradient if the context is unavailable, and survives context loss.
- **Five themes** — `cyan`, `amber`, `matrix`, `void`, `blood`. Switch with the
  pill in the header, the `C` key, or `theme <name>` in the shell. Persisted in
  `localStorage`; shareable via `?theme=matrix`.
- **Working terminal** — `help` lists everything. `neofetch` reports the live
  environment, `cat`, `ls`, `grep`, `ping`, `cowsay`, `now`, `sudo`, and a few
  easter eggs. `↑`/`↓` history, `Tab` completion.
- **God mode** — Konami code (`↑↑↓↓←→←→BA`) or `god`. Hot-pinks the shader and
  turns on the glitch pass.
- **Synthesised audio** — every sound is generated with oscillators. Off by
  default, toggled with the `SFX` pill or the `V` key. Never autoplays.
- **Live data** — Last.fm now-playing polled every 20s, GoatCounter visit total.
- **Accessibility** — `prefers-reduced-motion` disables the boot screen, the
  custom cursor, and all looping animation. Semantic landmarks, live regions,
  focus-visible rings, and a `<noscript>` fallback.

## Hotkeys

| key | action |
| --- | --- |
| `C` | next theme |
| `V` | sound on/off |
| `M` | matrix rain |
| `G` | god mode |
| `F` | fullscreen |
| `?` | terminal help |
| `T` `L` `D` `S` | open channel (only while the cards are on screen) |

## Local preview

Any static server works:

```sh
python3 -m http.server 8899
# → http://127.0.0.1:8899/
```

`?fast` skips the boot animation. `?theme=<name>` forces a palette.

## Deploy

Push to `main`. GitHub Pages serves it as-is — no workflow, no bundler.

## Note

The Last.fm API key lives in `js/app.js` in plain text. That is fine for a
read-only personal key: it is a public value by design, and this page only ever
makes unauthenticated read calls.

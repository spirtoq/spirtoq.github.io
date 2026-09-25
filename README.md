# SPIRTOQ // NULL SECTOR

Personal transmission node. Static site, no build step, no dependencies —
just GitHub Pages serving plain files.

## Structure

```
index.html          markup + inline analytics
404.html            themed error page
css/main.css        everything visual
js/gl.js            raw WebGL2 field renderer + matrix rain
js/audio.js         synthesised UI sound + ambient drone (Web Audio, no files)
js/radio.js         live radio player + audio-reactive spectrum
js/terminal.js      command interpreter
js/app.js           orchestration: boot, cursor, magnet, tilt, radio, themes
favicon.svg         mark
site.webmanifest    PWA manifest
avatar.gif          easter egg, lazy-loaded on click
```

## Features

- **WebGL2 background** — hand-written fragment shader (fbm nebula, hex lattice,
  cursor lens distortion, interaction energy). No three.js. Falls back to a CSS
  gradient if the context is unavailable, and survives context loss.
- **Live radio** — four [SomaFM](https://somafm.com/) stations with real
  now-playing metadata, no API key. Audio is routed through a Web Audio
  `AnalyserNode`, so the spectrum is driven by actual output rather than a
  looped animation. If a stream ever stops being CORS-readable the player
  notices the silence, swaps in a fresh element and says so.
- **Five themes** — `cyan`, `amber`, `matrix`, `void`, `blood`. Switch with the
  pill in the header, the `C` key, or `theme <name>` in the shell. Persisted in
  `localStorage`; shareable via `?theme=matrix`.
- **Working terminal** — `help` lists everything. `neofetch` reports the live
  environment, plus `cat`, `ls`, `grep`, `ping`, `cowsay`, `fm`, `nick`,
  `sudo` and a few easter eggs. `↑`/`↓` history, `Tab` completion.
- **God mode** — Konami code (`↑↑↓↓←→←→BA`) or `god`. Hot-pinks the shader and
  turns on the glitch pass.
- **Synthesised audio** — every UI sound is generated with oscillators. Off by
  default, toggled with the `SFX` pill or the `V` key. Never autoplays.
- **Copy-to-clipboard** — the Discord card puts `spirtoq_` on your clipboard
  instead of following a dead invite link.
- **Accessibility** — `prefers-reduced-motion` disables the boot screen, the
  custom cursor, and all looping animation. Semantic landmarks, live regions,
  focus-visible rings, and a `<noscript>` fallback.

## Channels

| key | where | goes to |
| --- | --- | --- |
| `T` | telegram | <https://t.me/ExteraSpirtoq> |
| `D` | discord | copies `spirtoq_` |
| `O` | osu! | <https://osu.ppy.sh/users/39388621> |
| `S` | steam | <https://steamcommunity.com/id/spirtoq/> |

Last.fm and Shikimori were removed — both are unreliable from Russia.

## Hotkeys

| key | action |
| --- | --- |
| `C` | next theme |
| `V` | sound on/off |
| `M` | matrix rain |
| `G` | god mode |
| `F` | fullscreen |
| `P` | radio play/pause |
| `[` `]` | previous / next station |
| `?` | terminal help |
| `T` `D` `O` `S` | open channel (only while the cards are on screen) |

## Local preview

Any static server works:

```sh
python3 -m http.server 8899
# → http://127.0.0.1:8899/
```

`?fast` skips the boot animation. `?theme=<name>` forces a palette.

## Deploy

Push to `main`. GitHub Pages serves it as-is — no workflow, no bundler.

## Credits

Radio streams and metadata come from [SomaFM](https://somafm.com/), who provide
them free and ask only for a link back. Visitor counter is
[GoatCounter](https://www.goatcounter.com/).

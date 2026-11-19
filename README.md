# Vice Cover Studio

![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/yudhisutawan77/gta6-cover-art/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/yudhisutawan77/gta6-cover-art/reward.svg)

Turn a photo and a caption into GTA-style cover art — a multi-panel poster with bold lettering and a Vice City sunset or neon colour grade — then export it as a PNG to share. Built for the [GTA 6 cover art bounty](https://make.fun/bounty/gta6-cover-art-01) on make.fun.

## How it works

1. **Add photos** — drop 1–4 of your own photos anywhere on the page, pick files, or try a built-in sample. One photo can fill every panel, or each panel can show a different photo.
2. **Frame each panel** — pick a layout (Vice Five, Duo Split, Trio Strip, Full Bleed), click a panel to select it, drag on the preview to pan, and use the zoom slider or Auto-fill to crop it.
3. **Write the caption** — title and subtitle, four ink colours, three positions (bottom band, top, over the hero panel). The lettering auto-fits the cover.
4. **Grade it** — Vice Sunset, Neon Nights, Palm Dusk or Gold Hour, with a strength slider, plus an original vector sun and palm silhouettes, film grain and a vignette.
5. **Export PNG** — one click, in 1080 × 1080, 1080 × 1350 or 1920 × 1080.

Everything renders on a 2D canvas with no libraries and no network: the app is plain static files under `app/`, photos are read on your own machine and never uploaded, and the display font (Anton, SIL Open Font License) ships under `app/fonts/`.

## Try it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

## Files

- `app/index.html` — the editor page
- `app/style.css` — the editor chrome
- `app/src/state.js` — the cover's state: layouts, grades, inks, crops
- `app/src/render.js` — the canvas renderer: panels, grades, vector sun and palms, lettering
- `app/src/editor.js` — the editor wiring: uploads, drag-to-pan, export
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover` / `?shot=editor`)
- `app/src/main.js` — entry point
- `main.ts` — hands the app and screenshots in as the entry
- `screenshots/` — the cover and the editor at work

All artwork in the app is original: no Rockstar Games logo, artwork or font is used anywhere.

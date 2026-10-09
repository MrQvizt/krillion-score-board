# Community how-to videos

Two 100-second, 1080p how-to videos for new divers, one per community:

| File | Community | Board |
| --- | --- | --- |
| [`join-the-krill-community.mp4`](join-the-krill-community.mp4) | Krill | 🐠 Evolution |
| [`join-the-papero-community.mp4`](join-the-papero-community.mp4) | Papero | 🐙 Papero |

Each video covers three steps:

1. **Join**: create an account on krillionscore.click, ask to join the community's board, and wait for an admin to approve.
2. **Play**: how Krillion works (7 daily prompts, rare answers pay more, 1 point = 10 m).
3. **Log**: log the score on the dashboard, then see it on the board.

The screens are recreated from the real components and styled with the app's own `src/app/globals.css`, so they match the site. The divers on the board are made up.

## Re-render

Re-render when the UI changes, or to add or change a community. Each community is one line in `VARIANTS` at the top of the script in `scene.html`, with its title name, board name, emoji and member count. The example diver is in `CONFIG`.

```bash
npm install            # in the repo root, once (the styles import src/app/globals.css)
cd video
npm install            # Tailwind CLI, fonts, Playwright
npx playwright install chromium   # skip if you already have it; or set CHROMIUM_PATH
npm run stills                          # a few PNG frames in build/stills/krill/
npm run render                          # join-the-krill-community.mp4 (about 15 minutes)
npm run render -- --variant papero      # join-the-papero-community.mp4
```

You need `ffmpeg` on the PATH. The soundtrack needs `python3` with `numpy`. Without them the video is rendered silent.

| File | What |
| --- | --- |
| `scene.html` | Every scene on one timeline. `window.render(t)` draws the frame at time `t`. `?variant=` picks the community. |
| `scene.css` | Tailwind entry: imports the app's `globals.css` and the Fredoka/Nunito fonts. |
| `render.mjs` | Compiles the CSS, steps through the timeline in headless Chromium and pipes the frames to ffmpeg. |
| `soundtrack.py` | A synthesised music bed, plus clicks, key taps and chimes timed from the scene's cue sheet. |

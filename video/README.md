# "Join our Krill community" video

[`join-the-krill-community.mp4`](join-the-krill-community.mp4) is a 100-second, 1080p how-to for new divers:

1. **Join**: create an account on krillionscore.click, then ask to join the Evolution board and wait for an admin to approve.
2. **Play**: how Krillion works (7 daily prompts, rare answers pay more, 1 point = 10 m).
3. **Log**: log the score on the dashboard, then see it on the board.

The screens are recreated from the real components and styled with the app's own `src/app/globals.css`, so they match the site. The divers on the board are made up.

## Re-render

Run this when the UI changes, or to use a different board name, emoji or example diver. All of those are in `CONFIG` at the top of the script in `scene.html`.

```bash
npm install            # in the repo root, once (the styles import src/app/globals.css)
cd video
npm install            # Tailwind CLI, fonts, Playwright
npx playwright install chromium   # skip if you already have it; or set CHROMIUM_PATH
npm run stills         # a few PNG frames in build/stills/ for a quick check
npm run render         # the full MP4 (about 15 minutes)
```

You need `ffmpeg` on the PATH. The soundtrack needs `python3` with `numpy`. Without them the video is rendered silent.

| File | What |
| --- | --- |
| `scene.html` | Every scene on one timeline. `window.render(t)` draws the frame at time `t`. |
| `scene.css` | Tailwind entry: imports the app's `globals.css` and the Fredoka/Nunito fonts. |
| `render.mjs` | Compiles the CSS, steps through the timeline in headless Chromium and pipes the frames to ffmpeg. |
| `soundtrack.py` | A synthesised music bed, plus clicks, key taps and chimes timed from the scene's cue sheet. |

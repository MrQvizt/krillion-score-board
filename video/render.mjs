// Renders scene.html to join-the-<variant>-community.mp4, one frame at a time.
//
//   npm install            (in video/, once; the repo root needs `npm install` too)
//   npm run render         the Krill (Evolution) video
//   npm run render -- --variant papero
//   npm run stills         a few PNGs in build/stills/<variant>/ for a quick look
//   node render.mjs --variant papero --stills 12.5,30
//
// Variants are defined in VARIANTS at the top of the script in scene.html.
//
// Needs ffmpeg on the PATH, and python3 with numpy for the soundtrack
// (without them the video is rendered silent).
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const variant = option("--variant") ?? "krill";
const stillsArg = option("--stills");

const build = path.join(here, "build");
const output = path.join(here, `join-the-${variant}-community.mp4`);
mkdirSync(build, { recursive: true });

function run(cmd, cmdArgs) {
  const res = spawnSync(cmd, cmdArgs, { cwd: here, stdio: "inherit" });
  if (res.status !== 0) throw new Error(`${cmd} exited with ${res.status}`);
}

console.log("Compiling styles…");
run(path.join(here, "node_modules/.bin/tailwindcss"), ["-i", "scene.css", "-o", "build/scene.css"]);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (err) => console.error("page error:", err.message));
const url = pathToFileURL(path.join(here, "scene.html"));
url.searchParams.set("variant", variant);
await page.goto(url.href);
await page.evaluate(() => window.READY);
const { fps, duration, events } = await page.evaluate(() => ({
  fps: window.FPS,
  duration: window.DURATION,
  events: window.AUDIO_EVENTS,
}));

async function frame(t) {
  await page.evaluate((time) => window.render(time), t);
  return page.screenshot({ type: "png" });
}

if (stillsArg) {
  const dir = path.join(build, "stills", variant);
  mkdirSync(dir, { recursive: true });
  for (const t of stillsArg.split(",").map(Number)) {
    const file = path.join(dir, `t-${t.toFixed(2).padStart(6, "0")}.png`);
    writeFileSync(file, await frame(t));
    console.log(file);
  }
  await browser.close();
  process.exit(0);
}

console.log("Writing soundtrack…");
const eventsFile = path.join(build, `${variant}-events.json`);
const wav = path.join(build, `${variant}-soundtrack.wav`);
writeFileSync(eventsFile, JSON.stringify({ duration, events }));
const audio = spawnSync("python3", [path.join(here, "soundtrack.py"), eventsFile, wav], { stdio: "inherit" });
const withAudio = audio.status === 0;
if (!withAudio) console.warn("Soundtrack failed; rendering without sound.");

const total = Math.round(duration * fps);
const ffmpeg = spawn(
  "ffmpeg",
  [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
    ...(withAudio ? ["-i", wav] : []),
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
    "-tune", "animation", "-r", String(fps),
    ...(withAudio
      ? [
          // -16 LUFS, then a hard ceiling so the click transients stay under -1 dBTP after AAC.
          "-af", "loudnorm=I=-16:LRA=11:TP=-2,alimiter=limit=0.75:attack=2:release=40:level=0",
          "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-shortest",
        ]
      : []),
    "-movflags", "+faststart",
    output,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);
const finished = new Promise((resolve, reject) => {
  ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
});

const started = Date.now();
for (let i = 0; i < total; i++) {
  const png = await frame(i / fps);
  if (!ffmpeg.stdin.write(png)) await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
  if (i % 150 === 0) console.log(`frame ${i}/${total} (${Math.round((Date.now() - started) / 1000)} s)`);
}
ffmpeg.stdin.end();
await finished;
await browser.close();
console.log(`Done: ${output}`);

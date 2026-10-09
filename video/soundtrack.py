"""Soundtrack for the community video: a calm underwater groove plus UI sounds.

    python3 soundtrack.py build/events.json build/soundtrack.wav

events.json comes from render.mjs: {"duration": seconds, "events": [{"t": s, "type": "click"|"key"|"chime"|"pop"|"whoosh"|"bloop"}]}.
Only needs numpy. Everything is synthesised, so there is nothing to license.
"""

import json
import sys
import wave

import numpy as np

SR = 48_000
rng = np.random.default_rng(41)


def note(name: str) -> float:
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + 12 * (octave + 1) - 69) / 12)


def lowpass(x: np.ndarray, cutoff: float, order: float = 2.0) -> np.ndarray:
    spec = np.fft.rfft(x, axis=0)
    freqs = np.fft.rfftfreq(x.shape[0], 1 / SR)
    gain = 1 / np.sqrt(1 + (freqs / cutoff) ** (2 * order))
    return np.fft.irfft(spec * (gain[:, None] if x.ndim == 2 else gain), n=x.shape[0], axis=0)


def highpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    return x - lowpass(x, cutoff)


def add(buf: np.ndarray, start: float, sig: np.ndarray, pan: float = 0.0) -> None:
    """Mix a mono signal into the stereo buffer at `start` seconds (pan -1..1)."""
    i = int(start * SR)
    if i >= buf.shape[0] or i + sig.shape[0] <= 0:
        return
    j = min(buf.shape[0], i + sig.shape[0])
    s = sig[: j - i] if i >= 0 else sig[-i : j - i]
    i = max(i, 0)
    buf[i:j, 0] += s * np.sqrt((1 - pan) / 2) * np.sqrt(2)
    buf[i:j, 1] += s * np.sqrt((1 + pan) / 2) * np.sqrt(2)


# IV - V - vi - I in D major, two bars each, so the loop (and the video) lands on D.
CHORD_LEN = 6.25
BEAT = CHORD_LEN / 8
CHORDS = [
    {"root": "G2", "pad": ["D3", "F#3", "B3", "A4"], "arp": ["G4", "B4", "D5", "F#5", "A5"]},
    {"root": "A2", "pad": ["E3", "A3", "C#4", "F#4"], "arp": ["A4", "C#5", "E5", "F#5", "A5"]},
    {"root": "B2", "pad": ["F#3", "A3", "D4", "E4"], "arp": ["B4", "D5", "F#5", "A5", "B5"]},
    {"root": "D3", "pad": ["A3", "C#4", "F#4", "E5"], "arp": ["D5", "F#5", "A5", "C#6", "E6"]},
]
ARP = [0, 2, 1, 3, None, 2, 4, 3, 0, 2, 1, 3, 2, None, 1, 4]


def pad_layer(duration: float) -> np.ndarray:
    n = int(duration * SR)
    out = np.zeros((n, 2))
    count = int(np.ceil(duration / CHORD_LEN))
    for k in range(count):
        chord = CHORDS[k % 4]
        t0 = k * CHORD_LEN - 0.8
        length = CHORD_LEN + 2.4
        t = np.arange(int(length * SR)) / SR
        env = np.minimum(1, t / 1.4) * np.minimum(1, (length - t) / 1.8)
        env = np.clip(env, 0, 1) ** 1.5
        for name in chord["pad"]:
            f = note(name)
            for side, cents in ((-0.6, -5), (0.6, 5), (0.0, 0)):
                ff = f * 2 ** (cents / 1200)
                phase = rng.uniform(0, 2 * np.pi)
                tone = np.sin(2 * np.pi * ff * t + phase) + 0.18 * np.sin(4 * np.pi * ff * t + phase)
                add(out, t0, tone * env * 0.03, pan=side)
    out = lowpass(out, 1800)
    lfo = 0.85 + 0.15 * np.sin(2 * np.pi * 0.08 * np.arange(n) / SR)
    return out * lfo[:, None]


def mallet(f: float, length: float = 1.6) -> np.ndarray:
    t = np.arange(int(length * SR)) / SR
    tone = (
        np.sin(2 * np.pi * f * t) * np.exp(-t * 4.5)
        + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 16)
        + 0.12 * np.sin(2 * np.pi * f * 9.8 * t) * np.exp(-t * 40)
    )
    return tone * np.minimum(1, t / 0.003)


def arp_layer(duration: float, start: float, end: float) -> np.ndarray:
    out = np.zeros((int(duration * SR), 2))
    step = BEAT / 2
    i = 0
    while True:
        t = start + i * step
        if t >= end:
            break
        chord = CHORDS[int(t // CHORD_LEN) % 4]
        idx = ARP[i % len(ARP)]
        if idx is not None:
            vel = (1.0 if i % 4 == 0 else 0.72) * rng.uniform(0.85, 1.0)
            fade_in = min(1.0, (t - start) / 5)
            add(out, t, mallet(note(chord["arp"][idx])) * 0.11 * vel * fade_in, pan=0.35 if i % 2 else -0.35)
        i += 1
    return out


def bass_layer(duration: float, start: float, end: float) -> np.ndarray:
    out = np.zeros((int(duration * SR), 2))
    bar = 0
    while bar * 4 * BEAT + start < end:
        t_bar = bar * 4 * BEAT
        chord = CHORDS[int(t_bar // CHORD_LEN) % 4]
        f = note(chord["root"])
        for offset, length, vel in ((0, 1.6, 1.0), (2.5, 1.0, 0.7)):
            t0 = t_bar + offset * BEAT
            if t0 < start or t0 >= end:
                continue
            t = np.arange(int(length * BEAT * SR)) / SR
            env = np.minimum(1, t / 0.012) * np.exp(-t * 1.6) * np.minimum(1, (length * BEAT - t) / 0.08)
            tone = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
            add(out, t0, tone * env * 0.16 * vel)
        bar += 1
    return out


def shaker_layer(duration: float, start: float, end: float) -> np.ndarray:
    out = np.zeros((int(duration * SR), 2))
    hit = highpass(rng.standard_normal(int(0.06 * SR)), 6000)
    hit *= np.exp(-np.arange(hit.shape[0]) / SR * 70)
    k = 0
    while True:
        t = start + (k + 0.5) * BEAT / 2
        if t >= end:
            break
        vel = 0.018 if k % 2 else 0.011
        add(out, t, hit * vel * rng.uniform(0.8, 1.1), pan=0.25)
        k += 1
    return out


def sfx(kind: str) -> np.ndarray:
    if kind == "click":
        t = np.arange(int(0.05 * SR)) / SR
        noise = highpass(rng.standard_normal(t.shape[0]), 2500)
        return (noise * np.exp(-t * 900) * 0.25 + np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 260) * 0.22)
    if kind == "key":
        t = np.arange(int(0.03 * SR)) / SR
        noise = highpass(rng.standard_normal(t.shape[0]), 3000)
        return noise * np.exp(-t * 1100) * rng.uniform(0.18, 0.26)
    if kind == "chime":
        t = np.arange(int(1.8 * SR)) / SR
        out = np.zeros(t.shape[0])
        for delay, f in ((0.0, note("A5")), (0.09, note("E6")), (0.18, note("A6"))):
            tt = np.clip(t - delay, 0, None)
            on = (t >= delay).astype(float)
            out += on * (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 3.2) + 0.25 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 9))
        return out * 0.15
    if kind == "pop":
        t = np.arange(int(0.12 * SR)) / SR
        f = 380 + 600 * (1 - np.exp(-t * 40))
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * 0.5
    if kind == "bloop":
        t = np.arange(int(0.25 * SR)) / SR
        f = 260 * np.exp(t * 14).clip(max=6)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * np.minimum(1, t / 0.004) * 0.22
    if kind == "whoosh":
        length = 0.9
        t = np.arange(int(length * SR)) / SR
        noise = lowpass(rng.standard_normal(t.shape[0]), 1400) - lowpass(rng.standard_normal(t.shape[0]), 200)
        return noise * np.sin(np.pi * t / length) ** 2 * 0.22
    raise ValueError(kind)


def bubbles(duration: float) -> np.ndarray:
    """Occasional faint bubble blips in the background."""
    out = np.zeros((int(duration * SR), 2))
    t = 1.5
    while t < duration - 1:
        b = sfx("bloop") * rng.uniform(0.12, 0.25)
        add(out, t, lowpass(b, 2200), pan=rng.uniform(-0.8, 0.8))
        t += rng.uniform(2.5, 6.0)
    return out


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    data = json.load(open(src))
    duration = float(data["duration"])
    n = int(duration * SR)

    music = pad_layer(duration)[:n]
    music += arp_layer(duration, 0.6, duration - 2.0)
    music += bass_layer(duration, 10.0, 92.0)
    music += shaker_layer(duration, 10.0, 91.0)
    music += bubbles(duration) * 0.6
    music *= 0.3 / max(1e-9, np.abs(music).max())

    fx = np.zeros((n, 2))
    for ev in data["events"]:
        add(fx, ev["t"], sfx(ev["type"]))

    # Plain gain staging, no saturation: clipping the stacked pad voices
    # smears harmonics across the mids.
    mix = music + fx
    t = np.arange(n) / SR
    mix *= np.minimum(1, t / 1.2)[:, None]
    mix *= np.clip((duration - t) / 2.5, 0, 1)[:, None]
    mix *= 0.89 / max(1e-9, np.abs(mix).max())

    pcm = (mix * 32767).astype("<i2")
    with wave.open(dst, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"Wrote {dst} ({duration:.1f} s)")


if __name__ == "__main__":
    main()

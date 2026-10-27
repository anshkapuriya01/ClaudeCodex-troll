#!/usr/bin/env python3
"""Estimate tempo, beat times and strong onsets of a music track so cuts can
land on the beat. Uses librosa if it is installed, otherwise a numpy-only
spectral-flux onset detector with autocorrelation tempo estimation (fine for
music with a clear pulse; check the result by ear or against the waveform).

usage: beats.py <audio_or_video> [--out edit/beats.txt] [--bpm-min 60 --bpm-max 180]
writes: one beat time per line (seconds) to --out, and prints tempo, the first
beats, the strongest onsets (candidate "hits" for titles/the turn), and bar
starts assuming 4/4 from the first beat.
"""
import argparse
import subprocess
import sys

import numpy as np

SR = 22050
HOP = 512


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def numpy_beats(y, bpm_min, bpm_max):
    n_fft = 2048
    win = np.hanning(n_fft).astype(np.float32)
    frames = 1 + max(0, (len(y) - n_fft) // HOP)
    idx = np.arange(n_fft)[None, :] + HOP * np.arange(frames)[:, None]
    spec = np.abs(np.fft.rfft(y[idx] * win, axis=1))
    spec = np.log1p(10 * spec)
    flux = np.maximum(0, np.diff(spec, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    # Normalize and remove slow trend so loud sections don't dominate.
    k = int(SR / HOP)  # ~1 s window
    trend = np.convolve(flux, np.ones(k) / k, mode="same")
    env = np.maximum(0, flux - trend)
    env /= env.max() or 1
    fps = SR / HOP

    # Tempo by autocorrelation of the onset envelope.
    ac = np.correlate(env, env, mode="full")[len(env) - 1:]
    lags = np.arange(len(ac))
    lo, hi = int(fps * 60 / bpm_max), int(fps * 60 / bpm_min)
    cand = lags[lo:hi]
    # Mild preference for ~110 BPM, the usual perceptual center.
    bpm = 60 * fps / np.maximum(cand, 1)
    weight = np.exp(-0.5 * (np.log2(bpm / 110) / 0.9) ** 2)
    i = lo + int(np.argmax(ac[lo:hi] * weight))
    # Refine the lag to sub-frame precision (parabolic fit around the peak).
    y0, y1, y2 = ac[i - 1], ac[i], ac[i + 1]
    denom = y0 - 2 * y1 + y2
    period = i + (0.5 * (y0 - y2) / denom if denom else 0.0)
    tempo = 60 * fps / period

    # Phase: the offset whose comb of beats collects the most onset energy.
    best, best_phase = -1, 0
    for ph in range(int(period)):
        s = env[np.round(np.arange(ph, len(env), period)).astype(int).clip(0, len(env) - 1)].sum()
        if s > best:
            best, best_phase = s, ph
    # Walk the beat grid; snap to a nearby onset only if it is strong,
    # otherwise keep the grid position so tempo stays steady.
    beats, t = [], float(best_phase)
    tol = max(1, int(0.08 * period))
    while t < len(env):
        c = int(round(t))
        a, b = max(0, c - tol), min(len(env), c + tol + 1)
        j = a + int(np.argmax(env[a:b]))
        t_beat = j if env[j] > 0.3 else t
        beats.append(t_beat / fps)
        t = t_beat + period
    peaks = [i for i in range(1, len(env) - 1) if env[i] > env[i - 1] and env[i] >= env[i + 1] and env[i] > 0.35]
    strong = sorted(peaks, key=lambda i: -env[i])[:12]
    # Frame i covers samples [i*HOP, i*HOP+n_fft); report the window center.
    off = (n_fft / 2) / SR
    return tempo, np.array(beats) + off, sorted(i / fps + off for i in strong)


def librosa_beats(path):
    import librosa
    y, sr = librosa.load(path, sr=SR, mono=True)
    tempo, frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=HOP)
    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
    on = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=HOP)
    strong = sorted(on, key=lambda i: -env[i])[:12]
    times = librosa.frames_to_time(frames, sr=sr, hop_length=HOP)
    return float(np.atleast_1d(tempo)[0]), times, sorted(librosa.frames_to_time(np.array(strong), sr=sr, hop_length=HOP))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("audio")
    p.add_argument("--out", default="edit/beats.txt")
    p.add_argument("--bpm-min", type=float, default=60)
    p.add_argument("--bpm-max", type=float, default=180)
    a = p.parse_args()
    try:
        tempo, beats, strong = librosa_beats(a.audio)
        method = "librosa"
    except ImportError:
        tempo, beats, strong = numpy_beats(load(a.audio), a.bpm_min, a.bpm_max)
        method = "numpy"
    with open(a.out, "w") as f:
        f.writelines(f"{t:.3f}\n" for t in beats)
    print(f"method: {method}  tempo: {tempo:.1f} BPM  beat: {60 / tempo:.3f}s  beats: {len(beats)} -> {a.out}")
    print("first beats: " + " ".join(f"{t:.2f}" for t in beats[:16]))
    print("bar starts (4/4 from first beat): " + " ".join(f"{t:.2f}" for t in beats[::4][:16]))
    print("strongest onsets (hits): " + " ".join(f"{t:.2f}" for t in strong))


if __name__ == "__main__":
    sys.exit(main())

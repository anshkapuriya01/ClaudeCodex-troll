#!/usr/bin/env python3
"""Measure a finished edit: duration, format, shot lengths (from scene
detection), black and frozen segments, and loudness. Prints a report with
pass/warn flags against the targets in references/anti-slop.md.

usage: qa_report.py <video> [--scene 0.3] [--target-lufs -14]
"""
import argparse
import json
import re
import statistics
import subprocess
import sys


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True).stderr


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate",
                          "-of", "json", path], capture_output=True, text=True).stdout
    return json.loads(out)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("video")
    p.add_argument("--scene", type=float, default=0.3)
    p.add_argument("--target-lufs", type=float, default=-14.0)
    a = p.parse_args()

    info = probe(a.video)
    dur = float(info["format"]["duration"])
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), {})
    au = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    num, den = (v.get("r_frame_rate", "0/1").split("/") + ["1"])[:2]
    fps = float(num) / float(den or 1)

    flags = []
    def flag(ok, msg):
        flags.append(("PASS" if ok else "WARN", msg))

    print(f"file: {a.video}")
    print(f"duration: {dur:.2f}s  video: {v.get('codec_name')} {v.get('width')}x{v.get('height')} "
          f"{fps:.3f}fps {v.get('pix_fmt')}  audio: {au['codec_name'] + ' ' + au.get('sample_rate', '') if au else 'none'}")
    flag(v.get("pix_fmt") == "yuv420p", "pixel format yuv420p (plays everywhere)")
    flag(au is not None, "has an audio track")

    # Shots
    log = run(["ffmpeg", "-hide_banner", "-i", a.video, "-vf",
               f"select='gt(scene,{a.scene})',metadata=print", "-an", "-f", "null", "-"])
    cuts = [float(x) for x in re.findall(r"pts_time:([0-9.]+)", log)]
    edges = [0.0] + cuts + [dur]
    shots = [b - x for x, b in zip(edges, edges[1:]) if b - x > 0.02]
    if shots:
        mean = statistics.mean(shots)
        sd = statistics.stdev(shots) if len(shots) > 1 else 0.0
        print(f"shots: {len(shots)}  len min {min(shots):.2f}  avg {mean:.2f}  max {max(shots):.2f}  stdev {sd:.2f}")
        print("shot lengths: " + " ".join(f"{s:.2f}" for s in shots))
        flag(len(shots) < 3 or sd >= 0.3 * mean, f"shot length varies (stdev/mean = {sd / mean if mean else 0:.2f}, want >= 0.30)")
        slivers = [round(edges[i], 2) for i, s in enumerate(shots) if s < 3 / fps] if fps else []
        flag(not slivers, f"no flash frames (<3 frames) {slivers if slivers else ''}")

    # Black and frozen segments
    log = run(["ffmpeg", "-hide_banner", "-i", a.video, "-vf", "blackdetect=d=0.1:pix_th=0.08", "-an", "-f", "null", "-"])
    blacks = re.findall(r"black_start:([0-9.]+) black_end:([0-9.]+)", log)
    print("black segments: " + (", ".join(f"{float(s):.2f}-{float(e):.2f}" for s, e in blacks) or "none"))
    log = run(["ffmpeg", "-hide_banner", "-i", a.video, "-vf", "freezedetect=n=0.003:d=1.5", "-an", "-f", "null", "-"])
    freezes = re.findall(r"freeze_start: ([0-9.]+)", log)
    print("frozen >1.5s at: " + (", ".join(freezes) or "none") + "  (fine for held titles/end card, check otherwise)")

    # Loudness
    if au:
        log = run(["ffmpeg", "-hide_banner", "-i", a.video, "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"])
        summ = log[log.rfind("Summary:"):]
        i = re.search(r"I:\s+(-?[0-9.]+) LUFS", summ)
        tp = re.search(r"Peak:\s+(-?[0-9.]+) dBFS", summ)
        lra = re.search(r"LRA:\s+([0-9.]+) LU", summ)
        if i:
            il = float(i.group(1))
            print(f"loudness: {il} LUFS integrated, true peak {tp.group(1) if tp else '?'} dBTP, LRA {lra.group(1) if lra else '?'} LU")
            flag(abs(il - a.target_lufs) <= 1.0, f"integrated loudness within 1 LU of {a.target_lufs}")
            if tp:
                flag(float(tp.group(1)) <= -0.9, "true peak <= -1 dBTP")

    print()
    for status, msg in flags:
        print(f"[{status}] {msg}")
    print("\nNext: extract_frames.sh on this file and view the contact sheets; then the anti-slop checklist.")


if __name__ == "__main__":
    sys.exit(main())

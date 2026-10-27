#!/usr/bin/env python3
"""Render a picture-only cut from an edit decision list (EDL).

Each non-empty, non-# line of the EDL is:
    <clip_path> <in_s> <out_s> [speed=1.0] [# note]
or, to place a shot by timeline duration instead of an out point:
    <clip_path> <in_s> +<timeline_dur_s> [speed]
Use the clip path "BLACK" for black frames:  BLACK 0 +0.5

speed < 1 is slow motion, > 1 is fast. Source span = timeline_dur * speed.
Every segment is rounded to whole frames and the running total is kept on the
frame grid, so cuts placed on beat times stay on the beat.

usage: render_edl.py edit/edl.txt edit/picture.mp4 [--fps 30] [--size 1920x1080]
       [--snap edit/beats.txt]   # print how far each cut is from the nearest beat
"""
import argparse
import os
import subprocess
import sys
import tempfile


def parse(path):
    shots = []
    for n, line in enumerate(open(path), 1):
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split()
        clip, t_in, t_out = parts[0], float(parts[1]), parts[2]
        speed = float(parts[3]) if len(parts) > 3 else 1.0
        if t_out.startswith("+"):
            dur = float(t_out[1:])
        else:
            dur = (float(t_out) - t_in) / speed
        if dur <= 0:
            sys.exit(f"line {n}: non-positive duration")
        shots.append((clip, t_in, dur, speed))
    return shots


def main():
    p = argparse.ArgumentParser()
    p.add_argument("edl")
    p.add_argument("out")
    p.add_argument("--fps", type=int, default=30)
    p.add_argument("--size", default="1920x1080")
    p.add_argument("--crf", type=int, default=16)
    p.add_argument("--snap", help="beats file to report cut-to-beat offsets")
    a = p.parse_args()
    w, h = a.size.split("x")
    shots = parse(a.edl)

    tmp = tempfile.mkdtemp(prefix="edl_")
    listfile = os.path.join(tmp, "list.txt")
    frames_total = 0
    cut_times = []
    with open(listfile, "w") as lf:
        for i, (clip, t_in, dur, speed) in enumerate(shots):
            # Keep cumulative time on the frame grid.
            end_frame = round((frames_total / a.fps + dur) * a.fps)
            nf = max(1, end_frame - frames_total)
            seg = os.path.join(tmp, f"seg_{i:03d}.mp4")
            vf_common = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,fps={a.fps},format=yuv420p"
            if clip == "BLACK":
                cmd = ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=black:s={w}x{h}:r={a.fps}",
                       "-frames:v", str(nf), "-vf", "format=yuv420p"]
            else:
                src_span = nf / a.fps * speed + 1.0  # read a little extra; frames:v trims
                cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{t_in:.3f}", "-t", f"{src_span:.3f}", "-i", clip,
                       "-vf", f"setpts=(PTS-STARTPTS)/{speed},{vf_common}", "-frames:v", str(nf), "-an"]
            cmd += ["-c:v", "libx264", "-preset", "fast", "-crf", str(a.crf), "-g", str(a.fps), seg]
            subprocess.run(cmd, check=True)
            got = int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
                                      "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", seg],
                                     capture_output=True, text=True).stdout.strip() or 0)
            if got < nf:
                print(f"warning: shot {i + 1} ({clip} @ {t_in}s) has only {got}/{nf} frames; "
                      f"the source is too short for that in-point/speed", file=sys.stderr)
            lf.write(f"file '{seg}'\n")
            frames_total += nf
            cut_times.append(frames_total / a.fps)

    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
                    "-c", "copy", "-movflags", "+faststart", a.out], check=True)
    print(f"{len(shots)} shots, {frames_total} frames, {frames_total / a.fps:.3f}s -> {a.out}")

    if a.snap and os.path.exists(a.snap):
        beats = [float(x) for x in open(a.snap) if x.strip()]
        print("cut  time    nearest_beat  offset_frames")
        for i, t in enumerate(cut_times[:-1], 1):
            b = min(beats, key=lambda x: abs(x - t))
            print(f"{i:>3}  {t:6.3f}  {b:6.3f}        {round((t - b) * a.fps):+d}")


if __name__ == "__main__":
    main()

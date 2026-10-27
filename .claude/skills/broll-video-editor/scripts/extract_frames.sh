#!/usr/bin/env bash
# Extract frames from a video at N fps (default 2), build timestamped contact
# sheets, and list detected cut times, so a video can be "watched" as images.
#
# usage: extract_frames.sh <video> <out_dir> [fps=2] [scene_threshold=0.3]
# writes: <out_dir>/frame_0001.jpg ...   (640 px wide, one every 1/fps s)
#         <out_dir>/contact_sheet_01.jpg ... (6x6 grid, 36 frames per sheet, timestamped)
#         <out_dir>/cuts.txt              (detected cut times in seconds)
#         <out_dir>/info.txt              (duration, resolution, fps, shot stats)
set -euo pipefail

in="${1:?usage: extract_frames.sh <video> <out_dir> [fps] [scene_threshold]}"
out="${2:?out_dir required}"
fps="${3:-2}"
thr="${4:-0.3}"
mkdir -p "$out"

# Individual frames, small enough to view many of them.
ffmpeg -hide_banner -loglevel error -y -i "$in" \
  -vf "fps=${fps},scale=640:-2" -q:v 3 "$out/frame_%04d.jpg"

# Contact sheets: same sampling, each tile stamped with its source timestamp.
# The timestamp is drawn before tiling, so it is the time in the source video.
ffmpeg -hide_banner -loglevel error -y -i "$in" \
  -vf "fps=${fps},scale=320:-2,drawtext=text='%{pts\:hms}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=4,tile=6x6:padding=4:margin=4:color=0x111111" \
  -q:v 3 "$out/contact_sheet_%02d.jpg"

# Cut detection from the scene-change score.
ffmpeg -hide_banner -i "$in" -vf "select='gt(scene,${thr})',metadata=print" -an -f null - 2>&1 \
  | grep -o 'pts_time:[0-9.]*' | cut -d: -f2 > "$out/cuts.txt" || true

dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
vinfo=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 "$in")
python3 - "$dur" "$out/cuts.txt" "$vinfo" "$fps" > "$out/info.txt" <<'PY'
import sys, statistics
dur = float(sys.argv[1]); cuts = [float(x) for x in open(sys.argv[2]) if x.strip()]
w, h, r = sys.argv[3].split(",")
num, den = (r.split("/") + ["1"])[:2]
edges = [0.0] + cuts + [dur]
shots = [b - a for a, b in zip(edges, edges[1:]) if b - a > 0.05]
print(f"duration_s: {dur:.2f}")
print(f"resolution: {w}x{h}  fps: {float(num)/float(den):.3f}")
print(f"sampled_at_fps: {sys.argv[4]}")
print(f"detected_cuts: {len(cuts)}  shots: {len(shots)}")
if shots:
    print(f"shot_len_s: min {min(shots):.2f}  avg {statistics.mean(shots):.2f}  max {max(shots):.2f}"
          + (f"  stdev {statistics.stdev(shots):.2f}" if len(shots) > 1 else ""))
PY

n=$(ls "$out"/frame_*.jpg | wc -l)
s=$(ls "$out"/contact_sheet_*.jpg | wc -l)
echo "frames: $n  contact_sheets: $s  -> $out"
cat "$out/info.txt"

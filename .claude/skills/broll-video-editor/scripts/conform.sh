#!/usr/bin/env bash
# Conform every video in a folder to one resolution, frame rate and pixel format
# (center-crop to fill, no letterboxing), with audio removed, so clips can be
# trimmed and concatenated without glitches.
#
# usage: conform.sh <in_dir> <out_dir> [width=1920] [height=1080] [fps=30] [crf=16]
set -euo pipefail

in="${1:?usage: conform.sh <in_dir> <out_dir> [w] [h] [fps] [crf]}"
out="${2:?out_dir required}"
w="${3:-1920}"; h="${4:-1080}"; fps="${5:-30}"; crf="${6:-16}"
mkdir -p "$out"

shopt -s nullglob nocaseglob
for f in "$in"/*.{mp4,mov,m4v,webm,mkv}; do
  name=$(basename "${f%.*}")
  dst="$out/$name.mp4"
  [[ -s "$dst" ]] && { echo "skip $name (exists)"; continue; }
  # Keep the source's own frame rate info so slow motion can be planned later.
  src_fps=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$f")
  echo "conform $name (src fps $src_fps)"
  ffmpeg -hide_banner -loglevel error -y -i "$f" \
    -vf "scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h},setsar=1,fps=${fps},format=yuv420p" \
    -an -c:v libx264 -preset medium -crf "$crf" -g "$fps" -movflags +faststart "$dst"
  echo "$name,$src_fps" >> "$out/source_fps.csv"
done
echo "done -> $out"

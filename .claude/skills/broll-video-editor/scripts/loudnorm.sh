#!/usr/bin/env bash
# Two-pass EBU R128 loudness normalization (accurate even on short clips,
# where single-pass loudnorm often misses the target by several LU).
#
# usage: loudnorm.sh <in_audio_or_video> <out.wav> [I=-14] [TP=-1.5] [LRA=11]
set -euo pipefail
in="${1:?usage: loudnorm.sh <in> <out.wav> [I] [TP] [LRA]}"; out="${2:?out required}"
I="${3:--14}"; TP="${4:--1.5}"; LRA="${5:-11}"

json=$(ffmpeg -hide_banner -i "$in" -vn -af "loudnorm=I=$I:TP=$TP:LRA=$LRA:print_format=json" -f null - 2>&1 \
  | sed -n '/^{/,/^}/p')
read -r mI mTP mLRA mTH off <<< "$(python3 -c "import json,sys;d=json.loads(sys.argv[1]);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])" "$json")"

ffmpeg -hide_banner -loglevel error -y -i "$in" -vn -af \
  "loudnorm=I=$I:TP=$TP:LRA=$LRA:measured_I=$mI:measured_TP=$mTP:measured_LRA=$mLRA:measured_thresh=$mTH:offset=$off:linear=true,aresample=48000" \
  -c:a pcm_s16le "$out"
echo "measured $mI LUFS -> target $I LUFS: $out"

# ffmpeg cookbook

Every command here has been run with ffmpeg 6.x. Paths assume the project layout from SKILL.md and that `SK` points to this skill's `scripts/` folder.

## Contents
1. Look at video (frames, contact sheets, cuts)
2. Probe
3. Conform
4. Beat and onset times
5. Cut from an EDL
6. Speed: slow motion and ramps
7. Transitions (the few worth using)
8. Titles: drawtext and PNG cards
9. Grade and texture
10. Sound: SFX placement, ducking, mix
11. Loudness
12. Mux and export
13. Reframe for 9:16 / 1:1
14. QA

---

## 1. Look at video

```bash
bash $SK/extract_frames.sh input.mp4 out_dir 2        # 2 fps frames + contact sheets + cuts.txt + info.txt
```
- `contact_sheet_01.jpg` holds 36 frames (18 s at 2 fps), each stamped with its source timestamp. Open it with the Read tool first, then open single `frame_NNNN.jpg` files for detail. Frame N is at `(N-1)/fps` seconds.
- Raise the fps (4–6) only for a short span you need to inspect closely, such as a title animation. Lower the scene threshold (0.2) for soft cuts; raise it (0.4) for handheld footage that triggers false cuts.
- A single frame at an exact time: `ffmpeg -ss 12.5 -i in.mp4 -frames:v 1 -q:v 2 f.jpg`

## 2. Probe

```bash
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,pix_fmt -of compact in.mp4
```
Note the source frame rate: 50/60/120 fps clips can be slowed down cleanly; 24/25/30 cannot.

## 3. Conform

```bash
bash $SK/conform.sh broll/raw broll/conformed 1920 1080 30     # vertical: 1080 1920 30
```
Center-crops to fill, sets fps and yuv420p, drops audio, records each source's fps in `source_fps.csv`. For shots you plan to slow down, cut them from `broll/raw/` (original fps) rather than from the conformed copy: `render_edl.py` handles either.

Pick one project frame rate and stick with it: 24 for a cinematic feel, 30 for social, 60 only for screen recordings or gaming.

## 4. Beat and onset times

```bash
python3 $SK/beats.py audio/music.mp3 --out edit/beats.txt
```
Prints the tempo, beat times, bar starts (every 4th beat) and the strongest onsets (candidate hits for titles and the turn). It uses librosa if installed (`pip install librosa`, more robust on complex music), otherwise numpy. On clean test tones it's within ~20 ms. Sanity-check: `60/tempo` should match the gap between beats; if the tempo is doubled or halved, pass `--bpm-min/--bpm-max` around the true value.

Cut planning: at 120 BPM a beat is 0.5 s; a half-bar (2 beats) is 1.0 s; a bar is 2.0 s. Write the EDL with `+duration` values that are multiples of the beat, starting the first shot so that cuts fall on beat times.

To trim music to length on a bar line and fade the tail:
```bash
ffmpeg -i music.mp3 -af "atrim=START:END,asetpts=PTS-STARTPTS,afade=t=out:st=$(python3 -c 'print(END-START-1.5)'):d=1.5" -ar 48000 audio/music_cut.wav
```
(START and END on bar starts from beats.py; or cut out a middle section and join two bar-aligned parts with `concat`.)

## 5. Cut from an EDL

`edit/edl.txt`:
```
# clip                         in    out|+dur  speed   note
broll/conformed/paper_03.mp4   2.10  +0.50              hook: fold, top->down
BLACK                          0     +0.50              beat of silence
broll/conformed/hinge_01.mp4   0.80  +1.00              match: top->down
broll/raw/knee_60fps.mp4       1.00  +2.00     0.5      slow-mo from 60 fps source
broll/conformed/bridge_02.mp4  4.00  6.00               out-point form
```
```bash
python3 $SK/render_edl.py edit/edl.txt edit/picture.mp4 --fps 30 --size 1920x1080 --snap edit/beats.txt
```
Each shot is rendered to an exact number of frames and the running total is kept on the frame grid. `--snap` prints each cut's offset from the nearest beat in frames: aim for 0 (±1). A warning means the source ran out of frames for that in-point/speed; choose an earlier in-point.

## 6. Speed

- Slow motion is clean only from high-fps sources: 60 fps → 0.5× at 30 fps, 120 fps → 0.25×. Use those in the EDL `speed` column with the raw file.
- Fast: `speed` 1.5–3 for energy in a build. Above 4×, it starts looking like time-lapse.
- Speed ramp inside one shot (normal, then slow into the impact):
```bash
ffmpeg -i raw.mp4 -filter_complex "[0:v]trim=0:1,setpts=PTS-STARTPTS[a];[0:v]trim=1:1.8,setpts=(PTS-STARTPTS)/0.4[b];[a][b]concat=n=2:v=1,fps=30,format=yuv420p" -an ramp.mp4
```
Render the ramp to a file, then use that file in the EDL.
- Avoid `minterpolate` for slow motion of 24/30 fps footage; it warps edges and is a visible artifact.

## 7. Transitions (the few worth using)

Hard cuts are the default. These are for section changes only.

- **Dip to black / cut to black**: put a `BLACK 0 +0.3` line in the EDL (with silence or a hit on the sound side). Strongest "turn" device.
- **Fade through black between two clips**:
  `ffmpeg -i a.mp4 -i b.mp4 -filter_complex "[0:v][1:v]xfade=transition=fadeblack:duration=0.4:offset=2.0,format=yuv420p" out.mp4` (offset = when the transition starts in the first clip)
- **Whip-pan blur**: horizontally blur the last 3–4 frames of the outgoing shot (and/or first frames of the next) and put a whoosh on it:
  `ffmpeg -i a.mp4 -vf "gblur=sigma=60:sigmaV=0.01:enable='gte(t,1.87)'" a_whip.mp4`
- **Flash frame**: a 1–2 frame white `color=white` segment on a hit. Use at most once.

Avoid xfade presets like `circleopen`, `pixelize`, `radial`, `zoomin`, `squeeze`: they read as template effects.

## 8. Titles

### Simple card with drawtext
```bash
FONT=fonts/InterTight-SemiBold.ttf   # or: FONT=$(fc-match -f '%{file}' 'Inter:bold')
ffmpeg -i edit/picture.mp4 -vf "drawtext=fontfile=$FONT:text='Some things weren’t made to fold.':fontsize=h*0.06:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,3.0,5.5)':alpha='if(lt(t,3.25),(t-3.0)/0.25,if(gt(t,5.25),(5.5-t)/0.25,1))'" -c:v libx264 -crf 16 edit/titled.mp4
```
- Use a typographic apostrophe (’) inside single-quoted text to avoid escaping. Escape `:` as `\:` and `%` as `\%`.
- Several titles: chain several `drawtext=...` filters with commas, each with its own `enable` window.
- Left-aligned on a grid: `x=w*0.08:y=h*0.72`.

### Rich cards as transparent PNGs (better kerning, multiple weights, masks)
Render with Pillow, or HTML/CSS screenshots with Playwright (`page.screenshot(omit_background=True)`) for complex layouts, then overlay:
```python
from PIL import Image, ImageDraw, ImageFont
W, H = 1920, 1080
img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
f = ImageFont.truetype("fonts/Fraunces-SemiBold.ttf", int(H * 0.075)); txt = "Built to bend."
l, t, r, b = d.textbbox((0, 0), txt, font=f)
d.text(((W - (r - l)) / 2 - l, (H - (b - t)) / 2 - t), txt, font=f, fill=(255, 255, 255, 255))
img.save("edit/title.png")
```
```bash
# show title.png from 3.0 s for 2.5 s with 0.25 s fades
ffmpeg -i edit/picture.mp4 -loop 1 -t 2.5 -i edit/title.png -filter_complex "[1:v]format=rgba,fade=t=in:st=0:d=0.25:alpha=1,fade=t=out:st=2.25:d=0.25:alpha=1,setpts=PTS-STARTPTS+3.0/TB[t];[0:v][t]overlay=0:0:eof_action=pass:format=auto,format=yuv420p" -c:v libx264 -crf 16 edit/titled.mp4
```
- **Mask reveal / per-word animation**: render a PNG sequence (one PNG per frame, e.g. 18 frames for 0.6 s at 30 fps) where the text is clipped by a growing rectangle or words appear one by one with an ease-out curve, then overlay it with `-framerate 30 -i title_%03d.png`. Ease-out cubic: `p = 1 - (1 - x) ** 3` for x in 0..1.
- Keep titles in the safe area: 5% margins for 16:9; for 9:16 keep the top 12% and bottom 20% free of text (platform UI).

## 9. Grade and texture

Apply after the cut, to the whole picture, so every clip shares one look.

```bash
# warm, slightly desaturated, soft contrast, subtle grain and vignette ("quiet premium")
ffmpeg -i edit/titled.mp4 -vf "eq=saturation=0.88:contrast=1.04:gamma=0.98,colortemperature=temperature=6000,vignette=angle=PI/5,noise=alls=6:allf=t,format=yuv420p" -c:v libx264 -crf 16 edit/graded.mp4

# lifted blacks, rolled-off highlights, teal-orange split (filmic)
-vf "curves=m='0/0.04 0.5/0.5 1/0.96',eq=saturation=0.9,colorbalance=rs=0.03:bs=-0.03:rh=0.02:bh=-0.02"

# punchy (hype): crushed blacks, more contrast
-vf "curves=m='0/0 0.1/0.06 0.5/0.5 0.9/0.95 1/1',eq=saturation=1.05:contrast=1.08"

# a .cube LUT, if you have one with a license that allows use
-vf "lut3d=file=look.cube"
```
- Order: fix outliers per clip (in the EDL step: add `eq=brightness=-0.05` etc. to that clip by pre-rendering it), then the global grade, then grain and vignette last.
- Grain `alls` 4–8 is subtle at 1080p; above 12 looks dirty. Use `allf=t` so grain moves over time.
- For a monochrome section: `hue=s=0`.
- Text should be added *before* grain so the type gets the same texture, or *after* the grade if you want it crisp. Choose one approach and use it for every title.

## 10. Sound: placement, ducking, mix

```bash
# music trimmed to picture length D, a whoosh peaking at the 1.9 s cut, a hit at 3.0 s
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 edit/graded.mp4)
ffmpeg -i audio/music_cut.wav -i audio/whoosh.wav -i audio/hit.wav -filter_complex "\
[0:a]atrim=0:$D,asetpts=PTS-STARTPTS,volume=0.8,afade=t=out:st=$(python3 -c "print($D-1)"):d=1[m];\
[1:a]adelay=1700|1700,volume=0.6[w];\
[2:a]adelay=3000|3000,volume=0.9[h];\
[m][w][h]amix=inputs=3:normalize=0:duration=first[a]" -map "[a]" -ar 48000 -c:a pcm_s16le edit/mix_raw.wav
```
- `adelay` is in milliseconds, one value per channel (`1700|1700` for stereo). For a whoosh, start it so its loudest point lands on the cut: delay = cut time − time-to-peak of the whoosh file.
- `amix ... normalize=0` keeps your levels; without it, every input is turned down.
- **Silence at the turn**: `volume=enable='between(t,6.0,7.0)':volume=0` on the music branch.
- **Duck music under voice-over** (voice on input 1):
  `[1:a]asplit[v][sc];[0:a][sc]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=300[m];[m][v]amix=inputs=2:normalize=0:duration=first[a]`
- **Ambience bed**: add a room-tone/ambience file at `volume=0.08`, looped with `-stream_loop -1` and trimmed with `atrim=0:$D`.
- Simple synthetic placeholders (only for testing timing, replace with real SFX):
  `anoisesrc=d=0.4:c=pink:a=0.5,afade=t=in:d=0.3,afade=t=out:st=0.3:d=0.1,highpass=f=800` (whoosh), `aevalsrc='sin(2*PI*50*t)*exp(-6*t)':s=48000:d=1.2` (sub hit).

## 11. Loudness

```bash
bash $SK/loudnorm.sh edit/mix_raw.wav edit/mix.wav -14 -1.5 11
```
Two-pass loudnorm with linear gain. Single-pass `loudnorm` on a short (≤30 s) mix often lands 2–4 LU low. Targets: −14 LUFS integrated for YouTube/Instagram/TikTok/X; −16 for podcasts/Apple; true peak ≤ −1 dBTP.

## 12. Mux and export

```bash
ffmpeg -i edit/graded.mp4 -i edit/mix.wav -map 0:v -map 1:a \
  -c:v libx264 -profile:v high -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart out/final.mp4
```
If the picture is already final H.264 yuv420p, `-c:v copy` avoids another generation of compression. For X, keep files under 512 MB, ≤ 2:20 for most accounts; for Instagram Reels, 1080×1920 at 30 fps.

## 13. Reframe for 9:16 / 1:1

Center crop from a 16:9 master (check every shot; move the crop where the subject is off-center):
```bash
ffmpeg -i out/final.mp4 -vf "crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920,setsar=1" -c:a copy out/final_9x16.mp4
# subject on the left third: replace the x expression with e.g. iw*0.15
# square: crop=ih:ih:(iw-ih)/2:0,scale=1080:1080
```
Titles must be re-rendered for the new frame, not cropped.

## 14. QA

```bash
python3 $SK/qa_report.py out/final.mp4
bash $SK/extract_frames.sh out/final.mp4 out/review 2
```
Then view `out/review/contact_sheet_*.jpg` and work through `references/anti-slop.md`.

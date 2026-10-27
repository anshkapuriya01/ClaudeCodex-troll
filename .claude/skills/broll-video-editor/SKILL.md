---
name: broll-video-editor
description: Produce professional, launch-film-quality short videos (10–90 s) by cutting real stock B-roll, royalty-free music and SFX, and restrained motion typography together with ffmpeg. Covers concept and visual-metaphor brainstorming, studying motion-graphics references frame by frame (ffmpeg at 2 fps), finding and downloading licensed B-roll on its own with web search (no API keys) from Pexels, Pixabay, Mixkit, Coverr, Wikimedia Commons and the Internet Archive, sourcing music and sound effects, editing to the beat, grading, and an anti-"AI slop" quality pass. Use this skill whenever the user wants a promo, launch video, product teaser, trend/news explainer, social reel, hype edit, sizzle reel, montage, or "a video like Apple/Anthropic launch videos", or asks for B-roll, stock footage, match cuts, kinetic type, or a video about a trending topic, even if they never say "B-roll" or "ffmpeg".
---

# B-roll Video Editor

You are acting as a small production team: creative director, researcher, editor, sound designer and colorist. The output is a finished MP4 that a human editor would not be embarrassed to post. Most AI-made videos look cheap for the same few reasons: one idea illustrated literally, clips chosen because they matched a keyword, cuts that ignore the music, default fonts sliding in with default easing, and nobody watching the result before shipping it. This skill exists to avoid every one of those.

The core idea, taken from how real promo teams work: **find one physical sensation that represents the topic, then gather many very different shots that all deliver that sensation, and cut them to music.** A viral teardown or durability video about a folding phone does not only show the phone. It shows paper being folded, a hinge closing, knees bending, origami, a bridge rising, a book slamming shut, a hand closing into a fist. The viewer feels "fold" thirty times in thirty seconds from thirty angles. That variety is what makes it feel produced instead of generated.

## Files in this skill

| File | Read it when |
|---|---|
| `references/sources.md` | Phase 2 and 4: where to find references, B-roll, music, SFX, and each source's license rules |
| `references/metaphor-mapping.md` | Phase 1: turning a topic into a shot list of visual metaphors (worked examples included) |
| `references/anti-slop.md` | Phase 6 and before delivery: the checklist of AI tells and how to fix each one |
| `references/ffmpeg-cookbook.md` | Phases 3–7: tested commands for frames, conforming, cutting, speed ramps, text, grading, audio, export |
| `scripts/extract_frames.sh` | Study a reference or a downloaded clip at 2 fps, plus a contact sheet you can view in one image |
| `scripts/grab_clip.py` | Download a clip you found (from its page or direct link), or search Wikimedia Commons / Internet Archive; logs the license. No API keys |
| `scripts/conform.sh` | Make every clip the same resolution, frame rate, pixel format, with audio stripped |
| `scripts/beats.py` | Tempo, beat times, bar starts and strongest hits of the music track |
| `scripts/render_edl.py` | Render the picture from a text edit list, frame-exact, with a cut-vs-beat report |
| `scripts/loudnorm.sh` | Two-pass loudness normalization to −14 LUFS |
| `scripts/qa_report.py` | Measure the finished cut: shot lengths, black frames, loudness, duration |

Read a reference file at the start of the phase that needs it, not all of them up front.

## Before you start: check the toolbox

```bash
ffmpeg -version | head -1; ffprobe -version | head -1
python3 -c "import yt_dlp" 2>/dev/null && echo yt-dlp ok || pip install yt-dlp
for h in www.pexels.com pixabay.com mixkit.co coverr.co commons.wikimedia.org archive.org; do
  echo "$h $(curl -s -o /dev/null -w '%{http_code}' -m 10 -A 'Mozilla/5.0' https://$h/)"; done
```

- ffmpeg must have `libx264` and `drawtext` (`ffmpeg -filters | grep drawtext`). If drawtext is missing, render titles as PNGs (see the cookbook) instead.
- No API keys are needed. You find footage yourself with your web search and fetch tools (and a browser tool, if the session has one), then download the clips you picked with `scripts/grab_clip.py`.
- The loop above shows which sources this machine can reach (200/3xx = reachable; 403 often means a bot check that a browser tool may pass). Plan around the reachable ones and tell the user which were blocked.

Make one project folder and keep everything in it:

```
project/
  brief.md          # Phase 0 answers
  refs/             # reference videos + their 2 fps frames (never used in the output)
  shotlist.md       # Phase 1 metaphor map and shot list
  broll/raw/        # downloads, untouched
  broll/conformed/  # after scripts/conform.sh
  audio/            # music + sfx
  licenses.json     # one entry per asset: source, url, author, license, date
  edit/             # intermediate renders, edl.txt
  out/final.mp4
```

## Phase 0: Brief (5 minutes, saves hours)

Write `brief.md` answering these. Ask the user only for what you cannot reasonably infer, and propose defaults instead of open questions.

1. **One-sentence message.** What should a viewer feel or know after watching? ("Folding phones are fragile, and this one cracked within hours.")
2. **The sensation word.** One verb or physical feeling that carries the topic: *fold, crack, speed, pressure, growth, connection, launch, collapse, precision, warmth*. Everything in Phase 1 grows from this word.
3. **Platform and aspect ratio.** 16:9 (YouTube/X landscape, 1920×1080), 9:16 (Reels/TikTok/Shorts, 1080×1920), 1:1 or 4:5 (feed). Pick one master; reframing later is lossy.
4. **Length.** Social: 15–30 s. Launch film: 30–90 s. If unsure, 30 s.
5. **Tone.** Pick one reference mood: *quiet premium* (Apple/Anthropic launch films: slow, warm, lots of air), *hype* (fast cuts on every beat), *documentary* (handheld, natural sound), *playful* (stop-motion steps, bright colors).
6. **Words on screen.** Max 3–6 short title cards for a 30 s video. Write them now; they are the script.
7. **Facts and claims.** If the video is about real news, list the facts and their sources. Do not put unverified claims on screen; phrase them as reports ("Owners report…").

## Phase 1: Concept and metaphor map

Read `references/metaphor-mapping.md`. Then, in `shotlist.md`:

1. Write the sensation word in the middle and brainstorm **at least 30** shots that deliver it, spread across these lanes so the edit has range:
   - **Literal**: the actual subject (the product, the event).
   - **Mechanical**: hinges, gears, presses, machines doing the motion.
   - **Human body**: hands, knees, spines, faces doing the motion.
   - **Material**: paper, fabric, metal, glass, liquid, dough doing the motion.
   - **Nature**: leaves, flowers, waves, rocks, animals doing it.
   - **Architecture / scale**: bridges, doors, cities, aerial shots doing it.
   - **Abstract / macro**: textures, light leaks, ink in water, slow-motion close-ups.
2. Mark each idea with the **direction of motion** (left→right, top→bottom, closing, opening, toward camera) and the **dominant shape** (line, circle, diagonal, center mass). These are what make match cuts possible later.
3. Pick an arc. A short film still needs a beginning, middle and end:
   - *Hook (0–3 s)*: the most striking single image or a hard sound. No logo, no title first.
   - *Build*: rhythm increases, metaphors stack, cuts get shorter.
   - *Turn*: one moment of silence, slow motion, or a cut to black: the "crack".
   - *Payoff*: the message on screen, the hero shot, end card.
4. Draft the shot list as a table: `#, time, lane, description, motion dir, shape, search terms, SFX`. Aim for 1.3–2× more shots than you will use; you will reject many after looking at them.

Check: if more than about a third of the list is literal, the edit will feel like a slideshow about the topic. Push more into the other lanes.

## Phase 2: Study references (watch before you make)

Professional editors watch work they admire before they cut. Do the same, and actually look at the frames.

1. Read the "Reference and inspiration" section of `references/sources.md`. Find 2–4 references matching the tone from the brief: a launch film, a motion designer's reel on Vimeo or Behance, a viral edit on the same topic. Prefer the creator's own page.
2. Download each for **private study only** (it never goes into the output):
   ```bash
   yt-dlp -f "bv*[height<=1080]+ba/b[height<=1080]" -o "refs/%(id)s.%(ext)s" "<url>"
   ```
   If a site blocks downloading or its terms forbid it, use a different reference instead of working around the block.
3. Extract frames at 2 fps and a contact sheet:
   ```bash
   bash scripts/extract_frames.sh refs/<file>.mp4 refs/<name>_frames 2
   ```
   This writes `frame_0001.jpg…` (one every 0.5 s), `contact_sheet.jpg` (a grid with timestamps), and `cuts.txt` (detected cut times). Open the contact sheet and a handful of individual frames with the Read tool to view them. Two frames per second is enough to see every shot change, composition and title animation phase without flooding your context. For a 60 s reference, view the contact sheet first and only open single frames where something interesting happens.
4. Write a short **reference breakdown** in `brief.md` for each:
   - Average shot length (from `cuts.txt`), and how it changes over the video.
   - Color: warm/cool, contrast, saturation, black level (lifted or crushed), grain.
   - Typography: serif or sans, weight, size relative to frame, case, where it sits, how it enters (cut, fade, mask reveal, per-word).
   - Transitions: what fraction are hard cuts (usually 90%+ in good work).
   - How sound lines up with cuts.
   - 2–3 specific things to borrow, and one thing to do differently.

Borrow the *grammar* (pacing, framing, type behavior), never the footage, logo, or exact title design.

## Phase 3: Gather B-roll

Read the B-roll and license sections of `references/sources.md`.

1. **Search wide, with several phrasings per shot.** Stock libraries are tagged by literal content, so search for what is literally on screen, not the idea: "paper folding macro", "origami hands close up", "knee bending slow motion", "door closing dark", not "fragility". Try 2–4 phrasings per shot. You do the searching yourself, no keys; `references/sources.md` → "Finding clips without API keys" has the exact search URLs and query patterns. In short:
   - **Web search with a site filter**: `site:pexels.com/video paper folding`, `site:mixkit.co paper fold`, `site:coverr.co bridge`, `site:pixabay.com/videos origami`. Each result is a single clip page.
   - **Site search pages**: open the site's own search URL (e.g. `https://www.pexels.com/search/videos/paper%20fold/`, `https://mixkit.co/free-stock-video/paper/`) with your fetch or browser tool and collect clip-page links.
   - **Keyless archives** (license metadata included):
     ```bash
     python3 scripts/grab_clip.py search --source commons --query "origami folding"
     python3 scripts/grab_clip.py search --source archive --query "drawbridge opening"
     ```
   Read each candidate's page (title, description, preview) before downloading, and check its license there.
2. **Download the clips you picked**, one page at a time:
   ```bash
   python3 scripts/grab_clip.py get "<clip page url>" --name paper-fold-macro --min-width 1920 --orientation landscape
   ```
   It reads the page, finds the video file links, downloads the smallest file at or above `--min-width`, falls back to yt-dlp, and appends page, author, license, size and fps to `licenses.json`. If you only have a direct file link (for example from a browser tool's network view or a "Download" button), pass it with `--page <clip page> --author ... --license ...`. If a page shows a bot check or a login wall, don't try to get around it; use a browser tool if one is available, or another source. Download at a human pace, only clips you've actually chosen (often 30–60 for a 30 s edit), and never bulk-crawl a site.
3. **Look at every download.** Do not pick clips from titles or thumbnails. For each clip:
   ```bash
   bash scripts/extract_frames.sh broll/raw/<clip>.mp4 /tmp/check_<clip> 2
   ```
   View the contact sheet. Keep a clip only if it has at least ~1.5 s of usable, stable, in-focus footage, the motion matches the shot list's direction, it has no visible watermark, logo, text, or recognizable brand (trademarked content is often excluded from stock licenses), and it fits the color world of the rest. Note the good in/out points (`clip, in, out, note`) in `shotlist.md`.
4. **Reject generic stock.** Smiling people pointing at laptops, handshakes, glowing brains, binary code rain, and "futuristic HUD" overlays read as filler instantly. A slightly odd but real and specific shot always beats a polished generic one.
5. **Mix sources and textures.** Combine sources and shooting styles (macro, aerial, handheld, locked-off, slow motion) so the edit doesn't feel like one stock pack. Avoid using more than two clips from the same uploader back to back.
6. **Conform everything** before editing so cuts and concatenation never glitch:
   ```bash
   bash scripts/conform.sh broll/raw broll/conformed 1920 1080 30
   ```
   (Use `1080 1920` for vertical. The script center-crops to fill, sets the frame rate, uses yuv420p, and drops audio.)

If a needed shot doesn't exist in any free library after honest searching, change the shot, don't fake it. Only use AI-generated footage if the user explicitly asks for it, and say in the hand-off which shots it was used for.

## Phase 4: Music and sound design

Sound is half of what makes a cut feel professional, and the part AI edits most often skip.

1. **Music first.** Pick the track before editing; the cut follows the music, not the reverse. Use the sources in `references/sources.md` (Pixabay Music, Mixkit, Uppbeat free tier, YouTube Audio Library for YouTube, Free Music Archive with a per-track license check). Find tracks yourself with web search and the sites' search pages, then download with `python3 scripts/grab_clip.py get "<track page>" --kind audio --out audio --name <name>`, which also records the license in `licenses.json`.
   - Quiet premium: sparse piano, warm pads, soft pulses, around 70–100 BPM.
   - Hype: clear kick, around 120–140 BPM, a drop you can land the turn on.
   - Pick a track whose structure fits your arc (an intro, a build, a hit). Trim the music to your length by cutting on a bar line, never by a fade in the middle of a phrase.
2. **Find the beats**: `python3 scripts/beats.py audio/music_cut.wav --out edit/beats.txt` (details in the cookbook, "Beat and onset times"). Cuts land on beats or on exact subdivisions of them; important moments land on downbeats or on the drop.
3. **Sound design layer** (from Freesound with the CC0 filter, Mixkit, Pixabay SFX, Zapsplat):
   - A **whoosh** 2–6 frames *before* fast transitions, peaking at the cut.
   - A **hit / impact** exactly on a title reveal or a hard cut to black.
   - A **riser** under the build, ending at the turn.
   - **Foley** that matches the picture: paper crinkle under paper folds, a hinge creak under a hinge. This is what makes B-roll feel *real*.
   - **Room tone / ambience** bed at a very low level so silence is never digital zero.
   - The **turn** often works best with the music cut out completely for 0.5–1.5 s.
4. Keep SFX tasteful: if every cut has a whoosh, none of them mean anything.

## Phase 5: Assemble the edit

Write the edit as data, then render it, so that changes are cheap.

1. Write `edit/edl.txt`, one shot per line: `clip in out speed note` (times in seconds, in/out from your Phase 3 notes).
2. Rules for pacing:
   - Cut on beats. In a hype section, 0.4–1.0 s per shot; in quiet premium, 1.5–4 s. Average shot length in good 30 s promos is usually 0.8–2.5 s.
   - **Vary the length.** Three short, one long. A run of identical lengths is a top AI tell.
   - **Cut on motion**: leave the outgoing shot mid-movement and enter the next shot mid-movement in the same direction. Motion carries the eye across the cut.
   - **Match cuts**: put shots with the same shape or motion back to back (a folding page → a closing door → a bending knee, all moving the same way). Plan at least 3 of them in a 30 s edit; they are the signature of a deliberate editor.
   - **Contrast**: wide after close, still after moving, dark after bright, but on purpose.
   - Hard cuts are the default. No star wipes, spins, page curls, glitch transitions, or default crossfades between every clip. Use a dip to black, a whip-pan blur, or a flash frame only at section changes.
3. **Speed**: slow motion (from high frame rate sources) for the turn, speed ramps into impacts. See the cookbook. Never slow 24/30 fps footage below ~0.7× with frame blending; it looks smeary.
4. Render the picture and check the sync:
   ```bash
   python3 scripts/render_edl.py edit/edl.txt edit/picture.mp4 --fps 30 --size 1920x1080 --snap edit/beats.txt
   ```
   Every cut should be 0 (±1) frames from a beat. Then view the picture at 2 fps with `extract_frames.sh` before adding titles; fixing the edit is cheapest now.

## Phase 6: Typography and motion graphics

Less is more. Titles are punctuation, not narration.

- **Fonts**: pick a real typeface with character and one weight contrast, not the defaults (system sans, Inter everywhere, Arial, Impact). For example, a grotesk like Söhne-alikes (Inter Tight, Manrope, Geist), a serif for warmth (Fraunces, Newsreader, EB Garamond, Instrument Serif), or a mono for technical topics (JetBrains Mono, IBM Plex Mono). Download open-license fonts from Google Fonts into `project/fonts/`. Max two families.
- **Size and placement**: large and confident (title cap height roughly 6–10% of frame height) or small and precise, never medium and timid. Respect a safe area of 5% (16:9) or 10% top/bottom (9:16, platform UI covers it). Align to a grid; centered is fine, but be consistent.
- **Case and words**: sentence case or all caps, short phrases (2–6 words), no exclamation marks, no emoji, no "Unleash / Revolutionize / Game-changer / Next-level / In a world where".
- **Animation**: hold titles long enough to read twice (about 0.3 s per word, minimum 1.2 s). Prefer a hard cut-in, a fade over 6–10 frames, or a mask/clip reveal. Use one consistent ease (ease-out, cubic or stronger). No bouncing, no per-letter spins, no every-line-slides-up-the-same-way.
- **Contrast**: put text over calm parts of the frame or on a solid card. Avoid drop shadows; if legibility needs help, darken the plate with a subtle vignette or gradient.
- Render text with `drawtext` for simple cards, or render title cards as transparent PNG frames (HTML/CSS with Playwright, or Pillow) for anything richer, then overlay. Both are in the cookbook.
- **End card**: message, maybe a URL or handle, hold 2–3 s. Only use a real brand's logo if the user owns it or has the rights.

## Phase 7: Finishing: grade, texture, mix, export

1. **Unify the color** so clips from 20 sources look like one film. Apply one shared grade to everything after the cut (cookbook → "Grade"): match exposure, pull saturation down slightly, choose a warm or cool bias, and slightly lift blacks for a filmic look or crush them for a punchy look. Fix outlier clips individually first (a shot much brighter or bluer than its neighbors).
2. **Texture, lightly**: fine film grain (`noise=alls=6:allf=t`) and a gentle vignette add the "photographed" feel. Subtle means you notice it when toggled off, not when it's on.
3. **Audio mix**: music bed around −18 to −14 LUFS before mastering, SFX sit just on top, duck the music under any voice. Master the final to **−14 LUFS integrated, −1 dBTP** for social platforms with `bash scripts/loudnorm.sh edit/mix_raw.wav edit/mix.wav`. Add 3–6 frame fades on the very first and last audio samples to kill clicks.
4. **Export**: H.264 High, yuv420p, `-crf 18`, `-preset slow`, AAC 192–320 kbps, 48 kHz, `-movflags +faststart`. Keep the master frame rate (don't convert 24→30).

## Phase 8: Review like an editor (do not skip)

1. Run `python3 scripts/qa_report.py out/final.mp4`. It reports duration, shot count, shot length min/avg/max and spread, black/frozen gaps, and loudness. Compare with the brief.
2. Extract the final at 2 fps and **view the contact sheet and frames yourself**. Look for: flash frames (1–2 frame slivers of the wrong clip), watermarks, text that's off-screen or unreadable, jumps in color, unintended black, the same clip used twice, or a cut that lands on nothing.
3. Read `references/anti-slop.md` and go through the checklist honestly. Fix anything that fails, re-render, and check again. One or two revision passes is normal.
4. Watch the timing against the beat list: every planned hit should land within one frame of its beat.

## Phase 9: Hand-off

Give the user:

- `out/final.mp4` (and a 9:16 or 1:1 version only if they asked).
- A 3–6 line summary: concept, sensation word, music track, number of shots and sources.
- `licenses.json` turned into a short credits list. Credit authors even where the license doesn't require it; it's good practice, and some sources (Free Music Archive CC-BY tracks, some Freesound sounds) do require it.
- Any caveats: shots you couldn't find and replaced, claims phrased as reports, assets that need a manual license check.

## Ethics and licensing, briefly

- Only put assets in the output whose license you have recorded and that allows the intended use. Reference videos are for study only.
- Many free stock licenses exclude using recognizable people in a way that suggests they endorse something, and exclude identifiable trademarks or logos from commercial use. Pick shots without visible logos when the topic is a real company.
- For news topics, don't present stock footage as footage of the actual event. A folding-paper metaphor is fine; a random cracked phone presented as "the actual iPhone Duo" is not. Label it ("illustrative") if a viewer could reasonably mistake it.
- Don't imitate a real company's official launch video so closely that it could be mistaken for theirs (their logo, product name as the title, their exact end card).

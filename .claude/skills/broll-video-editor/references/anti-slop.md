# Anti-slop checklist

"AI slop" is content that is technically fine and obviously made with no taste or attention. Viewers detect it in about two seconds and scroll. The tells are consistent, so they can be checked. Go through every item before delivering. For each one, say pass or fix, and fix before shipping.

## Concept and story

- [ ] **One idea, felt many ways.** The video is built on a sensation word with images from at least 4 metaphor lanes, not a literal illustration of each sentence.
- [ ] **Hook in the first 1–2 seconds.** It opens on a striking image or sound, not a logo, a title card or a slow fade from black.
- [ ] **There is a turn.** Something changes once: a silence, a slow-motion moment, a reversal. Flat energy from start to end reads as generated.
- [ ] **On-screen words earn their place.** 2–6 words per card, 3–6 cards per 30 s. No narration of what the picture already shows.
- [ ] **No hype vocabulary.** None of: unleash, revolutionize, game-changer, next-level, supercharge, elevate, seamless, cutting-edge, in a world where, the future is here, delve, journey. No exclamation marks, no emoji in titles.

## Footage

- [ ] **Every clip was watched**, at least via a 2 fps contact sheet, before it was used.
- [ ] **No generic stock clichés**: no handshake, no smiling team around a laptop, no glowing brain, no binary rain, no blue HUD overlay, no globe with connecting lines, no robot hand touching a human hand.
- [ ] **No watermark, logo, burned-in text or recognizable brand** in any frame.
- [ ] **No clip used twice** (unless deliberately, as a callback).
- [ ] **Variety of scale and texture**: at least one macro, one wide/aerial, one human, one handheld or organic shot.
- [ ] **No AI-video artifacts** if any generated footage was used: morphing hands, melting text, warping backgrounds, plastic skin. Real stock is preferred because it doesn't have these.
- [ ] **Consistent color world** after grading. No single shot jumps out as bluer, brighter or more saturated.

## Editing

- [ ] **Cuts land on the music.** Planned cuts are within 1 frame of a beat; the turn and the title hits land on downbeats.
- [ ] **Shot lengths vary.** `qa_report.py` shows a standard deviation of at least ~30% of the mean. Identical shot lengths are the strongest editing tell.
- [ ] **At least 3 match cuts** (shape or motion) in a 30 s edit.
- [ ] **Cut on motion**, with direction continuity inside sequences.
- [ ] **90%+ hard cuts.** No default crossfades between every clip, no star wipes, page curls, spins, glitch, zoom-blur or "ink" transition presets.
- [ ] **No Ken Burns slow zoom on everything.** Push-ins only on the shots that need emphasis, and not on video that already moves.
- [ ] **No flash frames** (1–3 frame slivers) unless deliberate.
- [ ] **Endings breathe.** The last shot or end card holds 2–3 s; the music resolves instead of being chopped.

## Typography and motion graphics

- [ ] **Deliberate typeface**, not system defaults; max two families; one weight contrast.
- [ ] **Not the AI default kit**: Inter on everything + italic serif accent + frosted glass cards + gradient blobs + the same slide-up ease on every element. Pick one strong idea instead.
- [ ] **One easing language** used consistently (e.g. all ease-out cubic); no bounce or elastic unless the tone is playful and it's done once.
- [ ] **Readable**: on screen ≥ 0.3 s per word, ≥ 1.2 s total, good contrast, inside the safe area (and away from the platform UI for 9:16).
- [ ] **No drop shadows, outer glows, bevels or gradients on text.**
- [ ] **Sentence case or all caps**, consistent. No Title Case On Every Word unless it's the brand style.

## Sound

- [ ] **Music picked first**, structure matches the arc, trimmed on a bar line.
- [ ] **Sound design present**: hits on title reveals, a whoosh or two before fast transitions, foley that matches the picture, a low ambience bed.
- [ ] **Silence used once**, at the turn.
- [ ] **Not over-designed**: not every cut has a whoosh.
- [ ] **Loudness**: −14 LUFS integrated (±1), true peak ≤ −1 dBTP, no clipping, no clicks at the start or end.

## Finish

- [ ] **One shared grade** over the whole edit.
- [ ] **Subtle grain/vignette**, noticeable only when switched off.
- [ ] **Export is clean**: H.264 yuv420p, correct aspect ratio, constant frame rate, `+faststart`, no black bars from a wrong scale.
- [ ] **You watched the final contact sheet** at 2 fps and checked the start, every title, the turn and the end card frame by frame.

## Honesty

- [ ] Stock footage is never presented as footage of the real event.
- [ ] Claims on screen are factual or clearly attributed ("Owners report…").
- [ ] Every asset in the video is in `licenses.json` with a license that allows this use.
- [ ] It can't be mistaken for an official video of a real company.

## How to fix the most common failures

| Symptom | Fix |
|---|---|
| Feels like a slideshow | Replace literal shots with other lanes; cut shorter in the build; add match cuts |
| Feels flat | Add a turn: kill the music for 1 s, slow-motion one shot, then hit the title on the next downbeat |
| Feels cheap | Usually the type or the grade. Remove effects, use one typeface, bigger or smaller, and apply one grade + grain |
| Feels busy | Remove a third of the titles and half of the SFX; lengthen the payoff shot |
| Cuts feel random | Re-time every cut to `beats.txt`; group shots by motion direction |

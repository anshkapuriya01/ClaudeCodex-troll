# Sources: references, B-roll, music, SFX, fonts

License terms change. Before using an asset in a published video, open its page and confirm the license, then record it in `licenses.json`:

```json
{"file": "broll/raw/pexels_123.mp4", "source": "pexels", "page": "https://www.pexels.com/video/...", "author": "Jane Doe", "license": "Pexels License", "downloaded": "2026-10-27", "note": "no logos visible"}
```

## Contents
1. Reference and inspiration (study only)
2. B-roll video
3. Music
4. Sound effects
5. Fonts
6. What to avoid

---

## 1. Reference and inspiration (study only, never in the output)

Use these to learn pacing, type, color and transitions. Download only for private analysis with `scripts/extract_frames.sh`, and only where downloading is allowed.

| Where | What it's good for | How to search |
|---|---|---|
| **Vimeo Staff Picks** (vimeo.com/channels/staffpicks) | Highest-craft short films, title sequences, brand films | Search "motion design reel", "brand film", "launch film", "title sequence" |
| **Behance → Motion** (behance.net/galleries/motion) | Freelancer and studio case studies, often with style frames and breakdowns | Filter "Motion", search the sensation word ("fold animation", "product launch") |
| **Dribbble** (dribbble.com, "animation" tag) | Short loops: UI motion, type animation, easing | Search "kinetic typography", "logo reveal" |
| **Motionographer** (motionographer.com) | Curated industry work and interviews | Browse recent features |
| **Art of the Title** (artofthetitle.com) | Film/TV title sequences: typography in motion | Look at serif/sans pairings, timing |
| **Stash** (stashmedia.tv) | Deep breakdowns of commercial motion work | Search by studio or brand |
| **Motion Design School / School of Motion blog** | Technique write-ups | Easing, kinetic type |
| **Studio and freelancer portfolios** | The work at its best | Search "motion designer portfolio", "freelance motion designer reel 2026"; Vimeo and the studio's own site usually host the full-quality reel |
| **Brand launch films** on official YouTube channels (Apple, Anthropic, Nothing, Teenage Engineering, Linear, Stripe, Vercel) | "Quiet premium" pacing, grade, type | Search "<brand> launch film", "<product> keynote film" |
| **The viral video itself** (X, YouTube, Bilibili, Douyin re-uploads) | What the audience is already responding to on this topic | Search the trend plus "video", "test", "teardown" |

What to write down from each: average shot length and how it changes, color/contrast/grain, typography (family class, weight, size, case, placement, entrance), share of hard cuts, how sound hits line up with cuts.

---

## 2. B-roll video

### Main sources (APIs available; scripts/fetch_broll.py supports them)

**Pexels** (pexels.com/videos, API: pexels.com/api)
- License: free for commercial and personal use, no attribution required (credit appreciated). Not allowed: selling unmodified copies, implying endorsement by people shown, using identifiable people in a bad light.
- API: `GET https://api.pexels.com/videos/search?query=...&orientation=landscape|portrait|square&size=large|medium|small&per_page=1-80&page=N`. Header `Authorization: <key>` (no "Bearer"). The response has `videos[].video_files[]` with `link, width, height, fps, quality, file_type`, plus `videos[].user.name` and `videos[].url`.
- Limits: about 200 requests/hour and 20,000/month by default. Show credit to Pexels where practical.
- Strength: modern, well-graded, lots of 4K and slow-motion, good human/lifestyle and macro footage.

**Pixabay** (pixabay.com/videos, API: pixabay.com/api/docs)
- License: Pixabay Content License, free for commercial use with no attribution. Not allowed: selling unaltered copies, using it in a misleading/offensive way, and using recognizable trademarks/brands in a way that infringes them.
- API: `GET https://pixabay.com/api/videos/?key=KEY&q=URL+encoded&video_type=all|film|animation&min_width=1920&per_page=3-200&safesearch=true&order=popular|latest`. Response: `hits[].videos.{large,medium,small,tiny}.{url,width,height,size}`, `hits[].pageURL`, `hits[].user`, `hits[].tags`.
- Limits: about 100 requests/60 s. Cache results for 24 h. Don't hotlink; download files to the project.
- Strength: huge library, lots of nature, abstract, animation, and older-looking footage.

### Additional sources (manual download)

| Source | License notes | Good for |
|---|---|---|
| **Mixkit** (mixkit.co/free-stock-video) | Mixkit Free License for commercial use, no attribution; some items are under a "restricted" license, check the clip page | Very clean, cinematic, curated |
| **Coverr** (coverr.co) | Free for commercial use, no attribution; has an API (coverr.co/developers) | Lifestyle, tech, aerials |
| **Videvo** (videvo.net) | Mixed: some free with attribution, some premium. Check every clip | Range |
| **Vecteezy / Videezy** | Free tier often requires attribution | Use only if credited |
| **NASA Image and Video Library** (images.nasa.gov) | Generally not copyrighted; no endorsement implied; NASA logo rules apply | Space, launches, Earth |
| **Internet Archive: Prelinger Archives** (archive.org/details/prelinger) | Many items public domain; check each | Vintage, industrial, documentary texture |
| **Wikimedia Commons** (commons.wikimedia.org) | Per-file: CC0, CC-BY, CC-BY-SA, PD. Credit as required | Specific real-world subjects |
| **Your own screen recordings / renders** | Yours | Product UI, code, data |

### Search tips
- Describe what's literally visible: subject + action + framing + speed. "hands folding paper macro slow motion", "hinge closing close up", "aerial bridge opening".
- Add style words that stock sites tag: `macro`, `slow motion`, `aerial`, `close up`, `dark background`, `studio`, `top view`, `4k`.
- Search synonyms and other languages for specific cultural subjects.
- Use the shot list's motion direction: if you need left→right, you can also mirror a clip (`hflip`) when it contains no text.
- Sort by "latest" to avoid the most overused clips that viewers have seen a hundred times.

---

## 3. Music

| Source | License notes |
|---|---|
| **Pixabay Music** (pixabay.com/music) | Pixabay Content License: commercial use, no attribution. Some tracks are registered with Content ID; keep the license certificate/page URL in case of a YouTube claim |
| **Mixkit Music** (mixkit.co/free-stock-music) | Mixkit Free License (music-specific terms); fine for videos, no attribution |
| **Uppbeat** (uppbeat.io) | Free tier with credit and a monthly download cap; gives a clearance code for YouTube |
| **YouTube Audio Library** (studio.youtube.com) | Free for use in YouTube videos; some tracks require attribution. Best only when the destination is YouTube |
| **Free Music Archive** (freemusicarchive.org) | Per-track Creative Commons license. CC-BY needs credit; NC tracks are not for commercial use; ND tracks can't be cut |
| **ccMixter** (ccmixter.org) | Per-track CC; check NC |
| **Incompetech (Kevin MacLeod)** | CC-BY 4.0, credit required; very widely used, so it may sound familiar |

Search by mood and instrumentation, not genre labels alone: "minimal piano pulse", "cinematic build", "ambient tech pulse", "percussive drums hybrid trailer", "lofi warm". Check that the track has a build and a clear hit you can land the turn on.

---

## 4. Sound effects

| Source | License notes |
|---|---|
| **Freesound** (freesound.org, API: freesound.org/docs/api) | Per-sound: CC0, CC-BY (credit), CC-BY-NC (non-commercial only). Filter with `license:"Creative Commons 0"` |
| **Mixkit SFX** (mixkit.co/free-sound-effects) | Free, no attribution |
| **Pixabay Sound Effects** (pixabay.com/sound-effects) | Pixabay Content License |
| **Zapsplat** (zapsplat.com) | Free account; free tier requires attribution |
| **Sonniss GDC bundles** (sonniss.com/gameaudiogdc) | Royalty-free, no attribution; large professional packs, downloaded once |
| **BBC Sound Effects** (sound-effects.bbcrewind.co.uk) | Personal, educational, research use only, so **not** for commercial or public promo work |

Useful search terms: "whoosh short", "swish", "riser", "reverse cymbal", "sub drop", "impact cinematic", "boom hit", "paper fold", "paper crinkle", "hinge creak", "glass crack", "camera shutter", "click mechanical", "room tone".

---

## 5. Fonts (open licenses, from fonts.google.com or the foundry's GitHub)

- Grotesk/neo-grotesk: Inter Tight, Manrope, Geist, Space Grotesk, Hanken Grotesk, Schibsted Grotesk
- Serif with character: Fraunces, Newsreader, Instrument Serif, EB Garamond, Playfair Display (for headlines only)
- Mono: JetBrains Mono, IBM Plex Mono, Geist Mono
- Condensed for punchy hype: Bebas Neue, Oswald, Anton (use sparingly)

All of these are SIL Open Font License: free to use in videos.

---

## 6. What to avoid

- Watermarked previews from paid stock sites (Shutterstock, Getty, Adobe Stock, Pond5, Artgrid, Storyblocks) unless the user has a license.
- Clips ripped from movies, TV, news broadcasts, other creators' videos, or the viral video itself. They're references, not B-roll.
- "Free" sites that re-host paid stock or carry no clear license.
- Footage with recognizable logos, brand names or packaging when the video concerns a real company.
- Music that "sounds like" a famous track. If it's a cover, a remix or an unlicensed upload, it will be claimed.

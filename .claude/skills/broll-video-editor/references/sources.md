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

### Sources (no API keys: you search, read the clip page, then download)

| Source | License | Good for |
|---|---|---|
| **Pexels** (pexels.com/videos) | Pexels License: free commercial use, no attribution required (credit appreciated). Not allowed: selling unmodified copies, implying people shown endorse something, showing identifiable people in a bad light | Modern, well-graded, lots of 4K, slow motion, macro, people |
| **Pixabay** (pixabay.com/videos) | Pixabay Content License: free commercial use, no attribution. Not allowed: selling unaltered copies, misleading use, using recognizable trademarks/brands | Huge library: nature, abstract, animation, older-looking footage |
| **Mixkit** (mixkit.co/free-stock-video) | Mixkit License: most clips free for commercial use without attribution; some are "Restricted", check the clip page | Very clean, cinematic, curated |
| **Coverr** (coverr.co) | Free for commercial use, no attribution | Lifestyle, tech, aerials |
| **Videvo** (videvo.net) | Mixed: some free with attribution, some premium. Check every clip | Range |
| **Vecteezy / Videezy** | Free tier often requires attribution | Use only if credited |
| **Wikimedia Commons** (commons.wikimedia.org) | Per file: CC0, PD, CC-BY (credit), CC-BY-SA (share-alike: your whole video would have to be CC-BY-SA, so avoid unless that's fine) | Specific real-world subjects, science, history. `grab_clip.py search --source commons` |
| **Internet Archive / Prelinger Archives** (archive.org/details/prelinger) | Per item; many public domain. Check the license field | Vintage, industrial, documentary texture. `grab_clip.py search --source archive` |
| **NASA Image and Video Library** (images.nasa.gov) | Generally not copyrighted; no endorsement implied; NASA logo rules apply | Space, launches, Earth |
| **Your own screen recordings / renders** | Yours | Product UI, code, data |

### Finding clips without API keys

Work like a researcher with a browser: search, open candidate pages, read them, then download only what you chose.

1. **Web search with a site filter** (your web search tool). Each hit is usually one clip page:
   ```
   site:pexels.com/video hands folding paper
   site:pixabay.com/videos origami
   site:mixkit.co/free-stock-video paper
   site:coverr.co/videos drawbridge
   site:commons.wikimedia.org filetype video mimosa pudica
   ```
2. **The site's own search page** (your fetch tool, or a browser tool if the site needs JavaScript or shows a bot check):
   ```
   https://www.pexels.com/search/videos/<query>/          (spaces as %20; add ?orientation=landscape|portrait)
   https://pixabay.com/videos/search/<query>/
   https://mixkit.co/free-stock-video/<one-word-tag>/     (e.g. /paper/, /bridge/, /hands/)
   https://coverr.co/s?q=<query>
   https://commons.wikimedia.org/w/index.php?search=<query>+filetype:video
   https://archive.org/search?query=<query>&and[]=mediatype:"movies"
   ```
   Collect the clip-page links from the results, not the thumbnails.
3. **Keyless archive search** with license metadata:
   ```bash
   python3 scripts/grab_clip.py search --source commons --query "paper folding" --orientation landscape
   python3 scripts/grab_clip.py search --source archive --query "bridge opening" --download 2
   ```
   (Results with NC/ND licenses are filtered out automatically.)
4. **Read the clip page** before downloading: title, description, duration, resolution, author, and the license line. Look at the preview or poster image for logos and watermarks.
5. **Download it**:
   ```bash
   python3 scripts/grab_clip.py get "<clip page url>" --name hands-fold-paper --min-width 1920 --orientation landscape
   ```
   - It picks the smallest file at or above `--min-width` from the links in the page (sizes are guessed from file names like `..._1920_1080_...` or `...-1080p.mp4`), then checks the real size with ffprobe. `--list` prints every link it found.
   - If the page's HTML has no file links (JavaScript-only pages), it tries yt-dlp. If that also fails, open the page with a browser tool, click the free download for the size you want, and pass the resulting direct file URL:
     `grab_clip.py get "<direct .mp4 url>" --page "<clip page url>" --author "Name" --license "Pexels License"`
   - Sites that answer scripts with a bot check, captcha or login wall: don't try to get around it. Use a browser tool if the session has one, or use another source.
6. **Pace and volume**: only download clips you've picked, one at a time (the script pauses between archive downloads). Never crawl whole search result pages automatically.

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

Find tracks the same way as clips: web search with `site:pixabay.com/music`, `site:mixkit.co/free-stock-music`, or the site's search page; listen-check by reading the page (BPM, mood, duration), then download with `grab_clip.py get "<track page>" --kind audio --out audio --name <name>`. Search by mood and instrumentation, not genre labels alone: "minimal piano pulse", "cinematic build", "ambient tech pulse", "percussive drums hybrid trailer", "lofi warm". Check that the track has a build and a clear hit you can land the turn on.

---

## 4. Sound effects

| Source | License notes |
|---|---|
| **Freesound** (freesound.org; search page filter "CC0") | Per-sound: CC0, CC-BY (credit), CC-BY-NC (non-commercial only). Filter with `license:"Creative Commons 0"` |
| **Mixkit SFX** (mixkit.co/free-sound-effects) | Free, no attribution |
| **Pixabay Sound Effects** (pixabay.com/sound-effects) | Pixabay Content License |
| **Zapsplat** (zapsplat.com) | Free account; free tier requires attribution |
| **Sonniss GDC bundles** (sonniss.com/gameaudiogdc) | Royalty-free, no attribution; large professional packs, downloaded once |
| **BBC Sound Effects** (sound-effects.bbcrewind.co.uk) | Personal, educational, research use only, so **not** for commercial or public promo work |

Download SFX with `grab_clip.py get "<sound page>" --kind audio --out audio/sfx --name <name>` (Freesound needs a free login to download originals; its previews are fine for timing tests only). Useful search terms: "whoosh short", "swish", "riser", "reverse cymbal", "sub drop", "impact cinematic", "boom hit", "paper fold", "paper crinkle", "hinge creak", "glass crack", "camera shutter", "click mechanical", "room tone".

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

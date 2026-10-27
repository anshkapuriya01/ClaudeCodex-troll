#!/usr/bin/env python3
"""Find and download B-roll without API keys, recording license details in a
JSON manifest.

Two subcommands:

  search  Keyless search of open archives that publish license metadata:
          Wikimedia Commons (--source commons) and the Internet Archive
          (--source archive). Prints candidates; add --download N to fetch.

            grab_clip.py search --source commons --query "paper folding"
            grab_clip.py search --source archive --query "bridge opening" --download 3

  get     Download one clip you picked from a page you found with web search
          (Pexels, Pixabay, Mixkit, Coverr, Videvo, NASA, ...) or a direct
          media URL. For a page, the script reads the HTML, collects the video
          file links in it, and downloads the smallest one at or above
          --min-width (falls back to yt-dlp if the page has no plain links).
          Add --kind audio to grab a music track or sound effect instead.

            grab_clip.py get "https://mixkit.co/free-stock-video/<clip>/"
            grab_clip.py get "<page url>" --author "Jane Doe" --license "Pexels License"

Common options: --out broll/raw  --manifest licenses.json  --min-width 1920
                --orientation landscape|portrait|square  --dry-run

Download clips one at a time at a human pace. If a site answers with a bot
check, a login wall, or its terms forbid automated downloads, don't try to get
around it; use a different source.
"""
import argparse
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from datetime import date

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/126.0 Safari/537.36 broll-video-editor/1.1")
MEDIA_RE = re.compile(r"""https?:(?:\\?/){2}[^\s"'<>()]+?\.(?:mp4|webm|mov|m4v|mp3|wav|ogg|m4a|flac)(?:\?[^\s"'<>()]*)?""", re.I)

# Default license text for well-known free stock sites. Always confirm on the clip page.
SITE_LICENSES = {
    "pexels.com": "Pexels License (free commercial use, no attribution required)",
    "pixabay.com": "Pixabay Content License (free commercial use, no attribution required)",
    "mixkit.co": "Mixkit License (check the clip page: Free or Restricted)",
    "coverr.co": "Coverr License (free commercial use, no attribution required)",
    "videvo.net": "Videvo: varies per clip (check page)",
    "nasa.gov": "NASA media: generally not copyrighted; no endorsement implied",
}


def fetch(url, accept="text/html,application/json,*/*"):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def download(url, dst, referer=None):
    headers = {"User-Agent": UA}
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    tmp = dst + ".part"
    with urllib.request.urlopen(req, timeout=180) as r, open(tmp, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    os.replace(tmp, dst)


def probe(path):
    if path.lower().endswith((".mp3", ".wav", ".ogg", ".m4a", ".flac")):
        d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                           capture_output=True, text=True).stdout.strip()
        return {"duration": round(float(d), 2)} if d else None
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate:format=duration", "-of", "json", path],
                         capture_output=True, text=True).stdout
    try:
        d = json.loads(out)
        s = d["streams"][0]
        num, den = (s.get("r_frame_rate", "0/1").split("/") + ["1"])[:2]
        return {"width": s["width"], "height": s["height"], "fps": round(float(num) / float(den or 1), 3),
                "duration": round(float(d["format"]["duration"]), 2)}
    except (KeyError, IndexError, ValueError, json.JSONDecodeError):
        return None


def guess_size(url):
    """Guess (width, height) from common naming patterns in stock file URLs."""
    u = urllib.parse.unquote(url).lower()
    m = re.search(r"(\d{3,4})\s*[x_]\s*(\d{3,4})", u)
    if m:
        return int(m.group(1)), int(m.group(2))
    for tag, wh in (("2160", (3840, 2160)), ("4k", (3840, 2160)), ("1440", (2560, 1440)), ("1080", (1920, 1080)),
                    ("720", (1280, 720)), ("540", (960, 540)), ("360", (640, 360))):
        if re.search(rf"(?<!\d){tag}p?(?!\d)", u):
            return wh
    if any(k in u for k in ("large", "hd", "high")):
        return (1920, 1080)
    if any(k in u for k in ("medium",)):
        return (1280, 720)
    if any(k in u for k in ("small", "tiny", "preview", "thumb", "low")):
        return (640, 360)
    return (0, 0)


def orient_ok(w, h, orientation):
    if not orientation or not w or not h:
        return True
    return {"landscape": w > h, "portrait": h > w}.get(orientation, abs(w - h) / max(w, h) < 0.1)


def choose(cands, min_width, orientation):
    """Smallest candidate whose long edge >= min_width, else the largest; unknown sizes last."""
    cands = [c for c in cands if orient_ok(c["width"], c["height"], orientation)] or cands
    if not cands:
        return None
    edge = lambda c: max(c["width"], c["height"])
    known = [c for c in cands if edge(c)]
    above = [c for c in known if edge(c) >= min_width]
    if above:
        return min(above, key=edge)
    if known:
        return max(known, key=edge)
    return cands[0]


def site_of(url):
    host = urllib.parse.urlparse(url).netloc.lower()
    for dom in SITE_LICENSES:
        if host == dom or host.endswith("." + dom):
            return dom
    return host


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40] or "clip"


class Manifest:
    def __init__(self, path):
        self.path = path
        self.items = json.load(open(path)) if os.path.exists(path) else []

    def has(self, url):
        return any(m.get("page") == url or m.get("media_url") == url for m in self.items)

    def add(self, entry):
        self.items.append(entry)
        with open(self.path, "w") as f:
            json.dump(self.items, f, indent=2)


def save(a, man, media_url, page, source, author, license_, extra=None):
    if man.has(page) or man.has(media_url):
        print(f"  already in manifest: {page}")
        return None
    name = f"{slugify(source)}_{slugify(a.name or os.path.basename(urllib.parse.urlparse(page).path) or 'clip')}"
    ext = os.path.splitext(urllib.parse.urlparse(media_url).path)[1].lower() or ".mp4"
    dst = os.path.join(a.out, name + ext)
    i = 2
    while os.path.exists(dst):
        dst = os.path.join(a.out, f"{name}_{i}{ext}")
        i += 1
    print(f"  downloading {media_url}\n           -> {dst}")
    if a.dry_run:
        return None
    download(media_url, dst, referer=page)
    info = probe(dst) or {}
    if not info:
        print("  warning: ffprobe could not read the file; it may be an HTML error page", file=sys.stderr)
    man.add({"file": dst, "source": source, "page": page, "media_url": media_url, "author": author,
             "license": license_, **info, **(extra or {}), "downloaded": date.today().isoformat(),
             "note": "confirm license on page; check every frame for logos/watermarks"})
    print("  ok " + (f"{info['width']}x{info['height']} {info['fps']}fps " if "width" in info else "") + f"{info.get('duration')}s")
    return dst


# ---------- get: one page or direct URL ----------

def cmd_get(a, man):
    url = a.url
    source = site_of(a.page or url)
    license_ = a.license or SITE_LICENSES.get(source, "UNKNOWN: check the page before using")
    if MEDIA_RE.fullmatch(url):
        return save(a, man, url, a.page or url, source, a.author, license_)

    try:
        page = fetch(url)
    except Exception as e:
        print(f"could not fetch page ({e}). If the site blocks scripts, open it with a browser tool "
              f"and pass the direct file URL instead, or pick another source.", file=sys.stderr)
        return None
    if re.search(r"captcha|cf-chl|just a moment|access denied", page[:5000], re.I):
        print("the site returned a bot check; use a different source or a browser tool", file=sys.stderr)
        return None

    text = html.unescape(page).replace("\\/", "/").replace("\\u002F", "/")
    links = sorted(set(m.group(0).replace("\\/", "/") for m in MEDIA_RE.finditer(text)))
    audio_ext = (".mp3", ".wav", ".ogg", ".m4a", ".flac")
    is_audio = lambda l: urllib.parse.urlparse(l).path.lower().endswith(audio_ext)
    links = [l for l in links if is_audio(l) == (a.kind == "audio")]
    cands = []
    for l in links:
        w, h = guess_size(l)
        cands.append({"url": l, "width": w, "height": h})
    if a.list:
        for c in cands:
            print(f"  {c['width']}x{c['height']}  {c['url']}")
    if a.kind == "audio":
        # Prefer lossless, then the largest-looking mp3; previews are often tagged "preview"/"low".
        rank = lambda c: (c["url"].lower().endswith((".wav", ".flac")), "preview" not in c["url"].lower(), len(c["url"]))
        best = max(cands, key=rank) if cands else None
    else:
        best = choose(cands, a.min_width, a.orientation)
    author = a.author
    if not author:
        m = re.search(r'"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"', text) or \
            re.search(r'<meta[^>]+name="author"[^>]+content="([^"]+)"', text)
        author = m.group(1) if m else None
    title = re.search(r"<title>([^<]+)</title>", page)
    extra = {"title": html.unescape(title.group(1)).strip()} if title else None
    if best and a.kind == "video" and max(best["width"], best["height"]) and max(best["width"], best["height"]) < a.min_width:
        print(f"  note: best file found is {best['width']}x{best['height']}, below --min-width {a.min_width}")
    if best:
        return save(a, man, best["url"], url, source, author, license_, extra)

    print("no direct video links in the page; trying yt-dlp", file=sys.stderr)
    if a.dry_run:
        return None
    os.makedirs(a.out, exist_ok=True)
    tpl = os.path.join(a.out, f"{slugify(source)}_%(id)s.%(ext)s")
    r = subprocess.run([sys.executable, "-m", "yt_dlp", "-q", "--no-playlist", "-f",
                        f"bv*[height<={max(a.min_width, 1080)}]/b", "--remux-video", "mp4",
                        "-o", tpl, "--print", "after_move:filepath", url], capture_output=True, text=True)
    if r.returncode != 0 or not r.stdout.strip():
        print(f"yt-dlp could not get it either: {r.stderr.strip()[-300:]}", file=sys.stderr)
        return None
    dst = r.stdout.strip().splitlines()[-1]
    man.add({"file": dst, "source": source, "page": url, "author": author, "license": license_,
             **(probe(dst) or {}), **(extra or {}), "downloaded": date.today().isoformat(),
             "note": "fetched with yt-dlp; confirm license on page"})
    print(f"  ok -> {dst}")
    return dst


# ---------- search: keyless archives with license metadata ----------

def search_commons(q, n):
    params = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": 6,
              "gsrsearch": f"filetype:video {q}", "gsrlimit": min(50, n * 3), "prop": "imageinfo",
              "iiprop": "url|size|mime|extmetadata"}
    data = json.loads(fetch("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)))
    out = []
    for p in (data.get("query") or {}).get("pages", {}).values():
        ii = (p.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata") or {}
        val = lambda k: re.sub(r"<[^>]+>", "", (md.get(k) or {}).get("value", "")).strip()
        lic = val("LicenseShortName")
        if not ii.get("url") or "NC" in lic or "ND" in lic:
            continue
        out.append({"title": p.get("title"), "page": ii.get("descriptionurl"), "media_url": ii["url"],
                    "width": ii.get("width", 0), "height": ii.get("height", 0),
                    "duration": ii.get("duration"), "author": val("Artist") or None,
                    "license": lic or "see page", "attribution_required": val("AttributionRequired") == "true"})
    return out


def search_archive(q, n):
    params = [("q", f"({q}) AND mediatype:movies AND licenseurl:*"), ("fl[]", "identifier"), ("fl[]", "title"),
              ("fl[]", "licenseurl"), ("fl[]", "creator"), ("rows", str(min(50, n * 3))), ("output", "json")]
    data = json.loads(fetch("https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(params)))
    out = []
    for d in data.get("response", {}).get("docs", []):
        lic = d.get("licenseurl", "")
        if "/nc" in lic or "-nc" in lic or "/nd" in lic or "-nd" in lic:
            continue
        try:
            meta = json.loads(fetch(f"https://archive.org/metadata/{d['identifier']}"))
        except Exception:
            continue
        files = [f for f in meta.get("files", []) if f.get("name", "").lower().endswith((".mp4", ".mov", ".webm"))]
        if not files:
            continue
        f = max(files, key=lambda f: int(f.get("size", 0) or 0))
        out.append({"title": d.get("title"), "page": f"https://archive.org/details/{d['identifier']}",
                    "media_url": f"https://archive.org/download/{d['identifier']}/{urllib.parse.quote(f['name'])}",
                    "width": int(f.get("width", 0) or 0), "height": int(f.get("height", 0) or 0),
                    "duration": f.get("length"), "author": d.get("creator") if isinstance(d.get("creator"), str) else None,
                    "license": lic, "attribution_required": "/by" in lic})
        time.sleep(0.3)
    return out


def cmd_search(a, man):
    fn = {"commons": search_commons, "archive": search_archive}[a.source]
    try:
        res = fn(a.query, a.limit)
    except Exception as e:
        print(f"{a.source} search failed: {e}", file=sys.stderr)
        return
    res = [r for r in res if orient_ok(r["width"], r["height"], a.orientation)]
    print(f"{a.source}: {len(res)} candidates for '{a.query}'")
    for i, r in enumerate(res[:a.limit], 1):
        print(f"{i:>2}. {r['width']}x{r['height']} {r.get('duration') or '?'}s  {r['license']}  {r['title']}\n    {r['page']}")
    for r in res[:a.download]:
        a.name = r["title"]
        save(a, man, r["media_url"], r["page"], a.source, r["author"], r["license"],
             {"title": r["title"], "attribution_required": r["attribution_required"]})
        time.sleep(1)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--out", default="broll/raw")
    common.add_argument("--manifest", default="licenses.json")
    common.add_argument("--min-width", type=int, default=1920, help="min long-edge pixels")
    common.add_argument("--orientation", choices=["landscape", "portrait", "square"])
    common.add_argument("--dry-run", action="store_true")
    sub = p.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("get", parents=[common], help="download one clip from a page or direct URL")
    g.add_argument("url")
    g.add_argument("--page", help="clip page URL, when url is a direct file link")
    g.add_argument("--author")
    g.add_argument("--license")
    g.add_argument("--name", help="short name for the file, e.g. paper-fold-macro")
    g.add_argument("--list", action="store_true", help="print every media link found on the page")
    g.add_argument("--kind", choices=["video", "audio"], default="video")
    s = sub.add_parser("search", parents=[common], help="keyless search: Wikimedia Commons / Internet Archive")
    s.add_argument("--source", choices=["commons", "archive"], required=True)
    s.add_argument("--query", required=True)
    s.add_argument("--limit", type=int, default=10)
    s.add_argument("--download", type=int, default=0, help="download the first N results")
    s.set_defaults(name=None, kind="video")
    a = p.parse_args()
    os.makedirs(a.out, exist_ok=True)
    man = Manifest(a.manifest)
    (cmd_get if a.cmd == "get" else cmd_search)(a, man)


if __name__ == "__main__":
    main()

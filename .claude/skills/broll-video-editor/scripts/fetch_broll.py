#!/usr/bin/env python3
"""Search Pexels and/or Pixabay for stock video and download the best matching
files, recording license details for each one in a JSON manifest.

Keys come from the environment: PEXELS_API_KEY, PIXABAY_API_KEY.

usage:
  fetch_broll.py --query "paper folding macro" [--source pexels,pixabay]
                 [--orientation landscape|portrait|square] [--min-width 1920]
                 [--min-dur 3] [--max-dur 30] [--per-query 6]
                 [--out broll/raw] [--manifest licenses.json] [--dry-run]

Only standard library is used. Respect each API's rate limits (see
references/sources.md); this script pauses briefly between requests.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date

UA = "broll-video-editor/1.0"


def get_json(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def download(url, dst):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    tmp = dst + ".part"
    with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    os.replace(tmp, dst)


def orientation_ok(w, h, orientation):
    if not orientation:
        return True
    if orientation == "landscape":
        return w > h
    if orientation == "portrait":
        return h > w
    return abs(w - h) / max(w, h) < 0.1


def pick_file(files, min_width, orientation):
    """Smallest mp4 at or above min_width (on the long edge for portrait),
    else the largest available. Avoids pulling 4K when 1080p is enough."""
    def long_edge(f):
        return f["width"] if orientation != "portrait" else f["height"]
    ok = [f for f in files if f.get("width") and f.get("height") and orientation_ok(f["width"], f["height"], orientation)]
    if not ok:
        return None
    above = [f for f in ok if long_edge(f) >= min_width]
    return min(above, key=long_edge) if above else max(ok, key=long_edge)


def search_pexels(q, a):
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        print("  pexels: PEXELS_API_KEY not set, skipping", file=sys.stderr)
        return []
    params = {"query": q, "per_page": min(80, a.per_query * 3)}
    if a.orientation:
        params["orientation"] = a.orientation
    data = get_json("https://api.pexels.com/videos/search?" + urllib.parse.urlencode(params),
                    {"Authorization": key})
    out = []
    for v in data.get("videos", []):
        if not (a.min_dur <= v.get("duration", 0) <= a.max_dur):
            continue
        files = [{"url": f["link"], "width": f.get("width") or 0, "height": f.get("height") or 0, "fps": f.get("fps")}
                 for f in v.get("video_files", []) if f.get("file_type") == "video/mp4"]
        f = pick_file(files, a.min_width, a.orientation)
        if f:
            out.append({"source": "pexels", "id": str(v["id"]), "page": v.get("url"),
                        "author": (v.get("user") or {}).get("name"), "author_url": (v.get("user") or {}).get("url"),
                        "license": "Pexels License (free commercial use, no attribution required)",
                        "duration": v.get("duration"), "file": f})
    return out


def search_pixabay(q, a):
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        print("  pixabay: PIXABAY_API_KEY not set, skipping", file=sys.stderr)
        return []
    params = {"key": key, "q": q[:100], "per_page": max(3, min(200, a.per_query * 3)),
              "safesearch": "true", "video_type": "film"}
    data = get_json("https://pixabay.com/api/videos/?" + urllib.parse.urlencode(params))
    out = []
    for h in data.get("hits", []):
        if not (a.min_dur <= h.get("duration", 0) <= a.max_dur):
            continue
        files = [{"url": v["url"], "width": v.get("width") or 0, "height": v.get("height") or 0, "fps": None}
                 for v in (h.get("videos") or {}).values() if v.get("url")]
        f = pick_file(files, a.min_width, a.orientation)
        if f:
            out.append({"source": "pixabay", "id": str(h["id"]), "page": h.get("pageURL"),
                        "author": h.get("user"), "author_url": None,
                        "license": "Pixabay Content License (free commercial use, no attribution required)",
                        "tags": h.get("tags"), "duration": h.get("duration"), "file": f})
    return out


SEARCHERS = {"pexels": search_pexels, "pixabay": search_pixabay}


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--query", required=True)
    p.add_argument("--source", default="pexels,pixabay")
    p.add_argument("--orientation", choices=["landscape", "portrait", "square"])
    p.add_argument("--min-width", type=int, default=1920, help="min long-edge pixels")
    p.add_argument("--min-dur", type=float, default=3)
    p.add_argument("--max-dur", type=float, default=40)
    p.add_argument("--per-query", type=int, default=6, help="max downloads per source")
    p.add_argument("--out", default="broll/raw")
    p.add_argument("--manifest", default="licenses.json")
    p.add_argument("--dry-run", action="store_true", help="list results without downloading")
    a = p.parse_args()

    os.makedirs(a.out, exist_ok=True)
    manifest = json.load(open(a.manifest)) if os.path.exists(a.manifest) else []
    have = {(m["source"], m["id"]) for m in manifest if "id" in m}
    slug = re.sub(r"[^a-z0-9]+", "-", a.query.lower()).strip("-")[:40]

    got = 0
    for src in [s.strip() for s in a.source.split(",") if s.strip()]:
        if src not in SEARCHERS:
            print(f"unknown source {src}", file=sys.stderr)
            continue
        try:
            results = SEARCHERS[src](a.query, a)
        except Exception as e:  # network or API error: report and continue with other sources
            print(f"  {src}: search failed: {e}", file=sys.stderr)
            continue
        print(f"{src}: {len(results)} usable results for '{a.query}'")
        n = 0
        for r in results:
            if n >= a.per_query:
                break
            if (r["source"], r["id"]) in have:
                continue
            f = r["file"]
            dst = os.path.join(a.out, f"{src}_{r['id']}_{slug}.mp4")
            print(f"  {r['id']} {f['width']}x{f['height']} {r['duration']}s  {r['page']}")
            if not a.dry_run:
                try:
                    download(f["url"], dst)
                except Exception as e:
                    print(f"    download failed: {e}", file=sys.stderr)
                    continue
                manifest.append({"file": dst, "source": src, "id": r["id"], "page": r["page"],
                                 "author": r["author"], "author_url": r.get("author_url"),
                                 "license": r["license"], "query": a.query,
                                 "width": f["width"], "height": f["height"], "duration": r["duration"],
                                 "downloaded": date.today().isoformat(),
                                 "note": "verify license on page; check for logos/watermarks"})
                have.add((src, r["id"]))
                time.sleep(0.3)
            n += 1
        got += n
        time.sleep(1)

    if not a.dry_run:
        with open(a.manifest, "w") as fh:
            json.dump(manifest, fh, indent=2)
    print(f"{'found' if a.dry_run else 'downloaded'} {got} clips; manifest: {a.manifest}")


if __name__ == "__main__":
    main()

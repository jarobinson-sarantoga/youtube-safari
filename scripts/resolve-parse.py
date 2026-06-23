#!/usr/bin/env python3
import json
import re
import sys


def fmt_time(seconds: float) -> str:
    s = int(seconds)
    h = s // 3600
    m = (s % 3600) // 60
    sec = s % 60
    if h > 0:
        return f"{h}:{m:02d}:{sec:02d}"
    return f"{m:02d}:{sec:02d}"


def parse_desc_chapters(desc: str):
    chapters = []
    for line in desc.splitlines():
        trimmed = line.strip()
        if not trimmed:
            continue
        match = re.match(r"^[\s•\-*]*(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$", trimmed)
        if not match:
            continue
        parts = match.group(1).split(":")
        nums = [int(p) for p in parts]
        if len(nums) == 3:
            seconds = nums[0] * 3600 + nums[1] * 60 + nums[2]
        else:
            seconds = nums[0] * 60 + nums[1]
        chapters.append({
            "seconds": seconds,
            "timestamp": match.group(1),
            "label": match.group(2).strip(),
        })
    return chapters


def main() -> None:
    data = json.load(sys.stdin)
    title = data.get("title") or "YouTube"
    description = data.get("description") or ""

    chapters = []
    for ch in data.get("chapters") or []:
        start = ch.get("start_time")
        label = (ch.get("title") or "").strip()
        if start is None or not label:
            continue
        seconds = int(start)
        chapters.append({
            "seconds": seconds,
            "timestamp": fmt_time(seconds),
            "label": label,
        })
    if not chapters and description:
        chapters = parse_desc_chapters(description)

    subtitles = []
    requested_subs = data.get("requested_subtitles") or {}
    for lang in ("en", "ja"):
        info = requested_subs.get(lang)
        if not info:
            continue
        url = info.get("url") or ""
        data_blob = info.get("data") or ""
        if not url and not data_blob:
            continue
        subtitles.append({
            "lang": lang,
            "ext": info.get("ext") or "vtt",
            "url": url,
            "data": data_blob,
            "name": info.get("name") or lang,
        })

    requested = data.get("requested_formats") or []
    video_url = ""
    audio_url = ""
    headers = {}
    for track in requested:
        vcodec = track.get("vcodec")
        acodec = track.get("acodec")
        if vcodec == "none" or (acodec not in (None, "none") and vcodec in (None, "none")):
            audio_url = track.get("url") or audio_url
        elif vcodec not in (None, "none"):
            video_url = track.get("url") or ""
            headers = track.get("http_headers") or headers
    if not video_url:
        video_url = data.get("url") or ""
        headers = data.get("http_headers") or headers
    if not video_url:
        sys.exit(1)
    ua = headers.get("User-Agent", "Mozilla/5.0")
    print(json.dumps({
        "title": title,
        "description": description,
        "chapters": chapters,
        "subtitles": subtitles,
        "video": video_url,
        "audio": audio_url,
        "ua": ua,
    }))


if __name__ == "__main__":
    main()

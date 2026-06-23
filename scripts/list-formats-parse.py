#!/usr/bin/env python3
import json
import re
import sys

MAX_HEIGHT = 2160


def label_for(height: int) -> str:
    if height == 2160:
        return "4K (2160p)"
    return f"{height}p"


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
    title = data.get("title") or ""
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

    heights = set()
    for fmt in data.get("formats") or []:
        vcodec = fmt.get("vcodec")
        if vcodec in (None, "none"):
            continue
        height = fmt.get("height")
        if not height or height <= 0 or height > MAX_HEIGHT:
            continue
        heights.add(int(height))

    qualities = [
        {"height": h, "label": label_for(h)}
        for h in sorted(heights, reverse=True)
    ]
    print(json.dumps({
        "title": title,
        "description": description,
        "chapters": chapters,
        "qualities": qualities,
    }, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()

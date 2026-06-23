#!/usr/bin/env python3
"""Pick view tab ref_id from agent-desktop snapshot JSON."""
import json
import os
import sys


def walk(n, label):
    if not isinstance(n, dict):
        return None
    if n.get("role") == "button" and (
        n.get("name") == label or n.get("description") == label
    ):
        return n.get("ref_id")
    for c in n.get("children") or []:
        ref = walk(c, label)
        if ref:
            return ref
    return None


def fallback_tabs(tree, label):
    unnamed = []

    def collect(n):
        if not isinstance(n, dict):
            return
        if n.get("role") == "button" and not n.get("name") and n.get("ref_id"):
            unnamed.append(n.get("ref_id"))
        for c in n.get("children") or []:
            collect(c)

    collect(tree)
    tabs = unnamed[-2:] if len(unnamed) >= 2 else unnamed
    idx = 0 if label == "Browse" else 1
    return tabs[idx] if idx < len(tabs) else ""


def main() -> None:
    label = os.environ["VIEW_TAB"]
    data = json.load(sys.stdin)
    tree = data.get("data", {}).get("tree", {})
    ref = walk(tree, label)
    if ref:
        print(ref)
        return
    print(fallback_tabs(tree, label))


if __name__ == "__main__":
    main()

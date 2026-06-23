#!/usr/bin/env python3
"""Pick feed row ref_id from agent-desktop snapshot JSON."""
import json
import sys


def walk(n, rows):
    if not isinstance(n, dict):
        return
    if (
        n.get("role") == "button"
        and n.get("description")
        and n.get("name") == n.get("description")
        and len(n.get("description", "")) > 20
    ):
        rows.append(n.get("ref_id"))
    for c in n.get("children") or []:
        walk(c, rows)


def main() -> None:
    row = max(0, int(sys.argv[1]) - 1)
    data = json.load(sys.stdin)
    rows = []
    walk(data.get("data", {}).get("tree", {}), rows)
    print(rows[row] if row < len(rows) else "")


if __name__ == "__main__":
    main()

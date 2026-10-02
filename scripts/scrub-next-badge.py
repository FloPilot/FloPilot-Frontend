#!/usr/bin/env python3
"""Paint over the Next.js bottom-left badge so docs screenshots stay clean."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw


def scrub(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    # Sidebar wash just above the badge zone.
    sample_y = max(0, h - 180)
    bg = im.getpixel((24, sample_y))[:3]
    # Badge sits ~100–200px from the left edge on 2x retina captures.
    left = 0
    top = h - 160
    right = 220
    bottom = h
    draw = ImageDraw.Draw(im)
    draw.rectangle((left, top, right, bottom), fill=bg + (255,))
    # Soft circle where the N badge sits.
    draw.ellipse((90, h - 140, 210, h - 20), fill=bg + (255,))
    im.convert("RGB").save(path, optimize=True)
    print(f"{path.name}: {w}x{h} scrubbed bg={bg} zone=({left},{top})-({right},{bottom})")


def main() -> None:
    paths = [Path(p) for p in sys.argv[1:]]
    if not paths:
        root = Path(__file__).resolve().parents[1] / "public" / "help-docs"
        paths = sorted(root.glob("*.png"))
    for path in paths:
        scrub(path)


if __name__ == "__main__":
    main()

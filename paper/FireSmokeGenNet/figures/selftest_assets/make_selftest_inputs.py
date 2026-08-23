#!/usr/bin/env python3
"""Generate NEUTRAL placeholder inputs used only to unit-test the
compose_qualitative_ablation.py / compose_qualitative_comparison.py
scripts.

These outputs are plain labeled color swatches -- explicitly NOT smoke
imagery, and NOT to be confused with real experimental results. They exist
solely so the compositing/tiling logic can be exercised end-to-end without
depending on real trained checkpoints.

Usage:
    python make_selftest_inputs.py --ablation-out /tmp/ablation_selftest
    python make_selftest_inputs.py --comparison-out /tmp/comparison_selftest
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SIZE = (384, 384)


def _load_font(size: int) -> ImageFont.ImageFont:
    for candidate in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def _swatch(text: str, color: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGB", SIZE, color)
    draw = ImageDraw.Draw(img)
    font = _load_font(20)
    draw.rectangle([4, 4, SIZE[0] - 4, SIZE[1] - 4], outline=(0, 0, 0), width=2)
    draw.text((16, 16), "SELFTEST\nPLACEHOLDER", fill=(0, 0, 0), font=font)
    draw.text((16, SIZE[1] - 60), text, fill=(0, 0, 0), font=font)
    return img


def make_ablation_selftest(out_dir: Path, samples_per_row: int = 4) -> None:
    conditions = [
        ("no_jca", (220, 180, 180)),
        ("no_mrdl", (180, 220, 180)),
        ("no_resnet50", (180, 180, 220)),
        ("no_filtering", (220, 220, 180)),
        ("full_model", (200, 200, 200)),
    ]
    for slug, color in conditions:
        row_dir = out_dir / slug
        row_dir.mkdir(parents=True, exist_ok=True)
        for i in range(samples_per_row):
            img = _swatch(f"{slug}\nsample_{i}", color)
            img.save(row_dir / f"sample_{i}.png")


def make_comparison_selftest(out_dir: Path) -> None:
    methods = [
        "stable_diffusion",
        "powerpaint",
        "sd_inpainting",
        "bld",
        "flamediffuser",
        "firesmokegennet",
    ]
    rows = ["scene_1", "scene_2", "scene_3", "failure_case"]
    for row_idx, row in enumerate(rows):
        row_dir = out_dir / row
        row_dir.mkdir(parents=True, exist_ok=True)
        for col_idx, method in enumerate(methods):
            shade = 150 + 10 * ((row_idx + col_idx) % 6)
            img = _swatch(f"{row}\n{method}", (shade, shade, 255 - shade))
            img.save(row_dir / f"{method}.png")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ablation-out", type=Path, default=None)
    parser.add_argument("--comparison-out", type=Path, default=None)
    parser.add_argument("--samples-per-row", type=int, default=4)
    args = parser.parse_args()

    if args.ablation_out is not None:
        make_ablation_selftest(args.ablation_out, args.samples_per_row)
        print(f"Wrote ablation self-test inputs to {args.ablation_out}")

    if args.comparison_out is not None:
        make_comparison_selftest(args.comparison_out)
        print(f"Wrote comparison self-test inputs to {args.comparison_out}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

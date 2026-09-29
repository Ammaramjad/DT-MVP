#!/usr/bin/env python3
"""Assemble Figure 8 ("Qualitative comparison", \\label{fig:qualitative})
from *real* generated images produced by each baseline and FireSmokeGenNet.

This script does NOT generate or fabricate any smoke imagery. It only tiles
already-generated PNG/JPEG images into the labeled grid described by the
manuscript caption in Section VI-G ("Qualitative Comparison"):

    Rows 1-3: Successful generations (three different scenes/masks)
    Row 4   : Failure cases (fog confusion, over-opacity)
    Columns : one per method, matching Table "tab:quantitative"
              (Stable Diffusion, PowerPaint, SD-Inpainting, BLD,
              FlameDiffuser, FireSmokeGenNet (Ours))

Expected input directory layout (one sub-folder per row, one image per
method inside each):

    <input_dir>/
        scene_1/stable_diffusion.png
        scene_1/powerpaint.png
        scene_1/sd_inpainting.png
        scene_1/bld.png
        scene_1/flamediffuser.png
        scene_1/firesmokegennet.png
        scene_2/...
        scene_3/...
        failure_case/...

Usage:
    python compose_qualitative_comparison.py \\
        --input-dir /path/to/comparison_images \\
        --output-pdf ../qualitative_comparison.pdf \\
        --output-png ../qualitative_comparison.png

The script exits with a clear error (and does not write placeholder output)
if any expected row/column image is missing, so it can never silently
produce a "figure" out of missing/fake data.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Column order and display labels follow Table "tab:quantitative" in the
# manuscript (Section VI-A), ending with the proposed method.
METHOD_SPECS: list[tuple[str, str]] = [
    ("stable_diffusion", "Stable Diffusion"),
    ("powerpaint", "PowerPaint"),
    ("sd_inpainting", "SD-Inpainting"),
    ("bld", "BLD"),
    ("flamediffuser", "FlameDiffuser"),
    ("firesmokegennet", "FireSmokeGenNet (Ours)"),
]

# Row order/labels follow the caption: "Rows 1-3: Successful generations.
# Row 4: Failure cases (fog confusion, over-opacity)."
ROW_SPECS: list[tuple[str, str]] = [
    ("scene_1", "Success #1"),
    ("scene_2", "Success #2"),
    ("scene_3", "Success #3"),
    ("failure_case", "Failure case"),
]

THUMB_SIZE = (256, 256)
LABEL_PANE_WIDTH = 160
HEADER_HEIGHT = 40
MARGIN = 10
FONT_SIZE = 18
BACKGROUND_COLOR = (255, 255, 255)
LABEL_COLOR = (20, 20, 20)


def _load_font(size: int) -> ImageFont.ImageFont:
    for candidate in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def _load_cell(row_dir: Path, method_slug: str) -> Image.Image:
    for ext in (".png", ".jpg", ".jpeg"):
        candidate = row_dir / f"{method_slug}{ext}"
        if candidate.exists():
            return Image.open(candidate).convert("RGB").resize(THUMB_SIZE, Image.LANCZOS)
    raise FileNotFoundError(
        f"Missing image for method '{method_slug}' in {row_dir}. "
        "This script only composes real generated images; it will not "
        "fabricate placeholder content for a missing method/scene pair."
    )


def build_panel(input_dir: Path) -> Image.Image:
    n_rows = len(ROW_SPECS)
    n_cols = len(METHOD_SPECS)

    col_width = THUMB_SIZE[0] + MARGIN
    row_height = THUMB_SIZE[1] + MARGIN

    canvas_w = LABEL_PANE_WIDTH + n_cols * col_width + MARGIN
    canvas_h = HEADER_HEIGHT + n_rows * row_height + MARGIN

    canvas = Image.new("RGB", (canvas_w, canvas_h), BACKGROUND_COLOR)
    draw = ImageDraw.Draw(canvas)
    font = _load_font(FONT_SIZE)

    for col_idx, (_slug, label) in enumerate(METHOD_SPECS):
        x0 = LABEL_PANE_WIDTH + col_idx * col_width
        draw.text((x0, MARGIN), label, fill=LABEL_COLOR, font=font)

    for row_idx, (row_slug, row_label) in enumerate(ROW_SPECS):
        row_dir = input_dir / row_slug
        if not row_dir.is_dir():
            raise FileNotFoundError(f"Missing required scene directory: {row_dir}")

        y0 = HEADER_HEIGHT + row_idx * row_height
        text_y = y0 + THUMB_SIZE[1] // 2 - FONT_SIZE // 2
        draw.text((MARGIN, text_y), row_label, fill=LABEL_COLOR, font=font)

        for col_idx, (method_slug, _label) in enumerate(METHOD_SPECS):
            img = _load_cell(row_dir, method_slug)
            x0 = LABEL_PANE_WIDTH + col_idx * col_width
            canvas.paste(img, (x0, y0))

    return canvas


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output-pdf", required=True, type=Path)
    parser.add_argument("--output-png", type=Path, default=None)
    args = parser.parse_args()

    panel = build_panel(args.input_dir)

    args.output_pdf.parent.mkdir(parents=True, exist_ok=True)
    panel.save(args.output_pdf, "PDF")
    print(f"Wrote {args.output_pdf}")

    if args.output_png is not None:
        args.output_png.parent.mkdir(parents=True, exist_ok=True)
        panel.save(args.output_png, "PNG")
        print(f"Wrote {args.output_png}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

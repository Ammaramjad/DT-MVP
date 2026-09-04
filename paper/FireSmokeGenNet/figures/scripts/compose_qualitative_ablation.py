#!/usr/bin/env python3
"""Assemble Figure 7 ("Qualitative ablation results", \\label{fig:ablation_vis})
from *real* generated images produced by each ablated configuration.

This script does NOT generate or fabricate any smoke imagery. It only tiles
already-generated PNG/JPEG images (produced by the actual FireSmokeGenNet
pipeline and its ablated variants) into the labeled grid described by the
manuscript caption/bullet list in Section VI-F ("Qualitative Ablation
Visualizations"):

    - No JCA            : unrealistic texture repetition, poor background
                          integration
    - No MRDL           : sharp, binary boundaries, no semi-transparency
    - No ResNet50       : severe artifacts / incoherent smoke structures
    - No filtering      : occasional catastrophic failures (wrong colors)
    - Full FireSmokeGenNet : realistic, semi-transparent smoke, natural
                          boundaries

Expected input directory layout (one sub-folder per row, images inside):

    <input_dir>/
        no_jca/sample_0.png ... sample_{N-1}.png
        no_mrdl/sample_0.png ...
        no_resnet50/sample_0.png ...
        no_filtering/sample_0.png ...
        full_model/sample_0.png ...

Each row must contain the same number of samples (same scene/mask across
columns is recommended for a fair side-by-side comparison, but not enforced).

Usage:
    python compose_qualitative_ablation.py \\
        --input-dir /path/to/ablation_images \\
        --output-pdf ../qualitative_ablation.pdf \\
        --output-png ../qualitative_ablation.png \\
        --samples-per-row 4

The script exits with a clear error (and does not write placeholder output)
if any expected row directory is missing or empty, so it can never silently
produce a "figure" out of missing/fake data.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Row order and display labels follow the bullet list in the manuscript,
# Section VI-F, "Qualitative Ablation Visualizations".
ROW_SPECS: list[tuple[str, str]] = [
    ("no_jca", "No JCA"),
    ("no_mrdl", "No MRDL"),
    ("no_resnet50", "No ResNet50"),
    ("no_filtering", "No filtering"),
    ("full_model", "Full FireSmokeGenNet"),
]

THUMB_SIZE = (384, 384)
LABEL_PANE_WIDTH = 220
MARGIN = 12
LABEL_FONT_SIZE = 22
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


def _collect_row_images(row_dir: Path, samples_per_row: int) -> list[Image.Image]:
    if not row_dir.is_dir():
        raise FileNotFoundError(
            f"Missing required ablation-condition directory: {row_dir}. "
            "This script only composes real generated images; it will not "
            "fabricate placeholder content for a missing condition."
        )
    files = sorted(
        p
        for p in row_dir.iterdir()
        if p.suffix.lower() in {".png", ".jpg", ".jpeg"}
    )
    if not files:
        raise FileNotFoundError(f"No images found in {row_dir}.")
    if len(files) < samples_per_row:
        raise ValueError(
            f"{row_dir} has only {len(files)} image(s) but "
            f"--samples-per-row={samples_per_row} was requested."
        )
    files = files[:samples_per_row]
    return [Image.open(p).convert("RGB").resize(THUMB_SIZE, Image.LANCZOS) for p in files]


def build_panel(input_dir: Path, samples_per_row: int) -> Image.Image:
    rows_of_images = []
    for slug, _label in ROW_SPECS:
        rows_of_images.append(_collect_row_images(input_dir / slug, samples_per_row))

    n_rows = len(ROW_SPECS)
    n_cols = samples_per_row

    row_height = THUMB_SIZE[1] + MARGIN
    col_width = THUMB_SIZE[0] + MARGIN

    canvas_w = LABEL_PANE_WIDTH + n_cols * col_width + MARGIN
    canvas_h = n_rows * row_height + MARGIN

    canvas = Image.new("RGB", (canvas_w, canvas_h), BACKGROUND_COLOR)
    draw = ImageDraw.Draw(canvas)
    font = _load_font(LABEL_FONT_SIZE)

    for row_idx, ((_slug, label), images) in enumerate(zip(ROW_SPECS, rows_of_images)):
        y0 = MARGIN + row_idx * row_height
        text_y = y0 + THUMB_SIZE[1] // 2 - LABEL_FONT_SIZE // 2
        draw.text((MARGIN, text_y), label, fill=LABEL_COLOR, font=font)
        for col_idx, img in enumerate(images):
            x0 = LABEL_PANE_WIDTH + col_idx * col_width
            canvas.paste(img, (x0, y0))

    return canvas


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", required=True, type=Path)
    parser.add_argument("--output-pdf", required=True, type=Path)
    parser.add_argument("--output-png", type=Path, default=None)
    parser.add_argument("--samples-per-row", type=int, default=4)
    args = parser.parse_args()

    panel = build_panel(args.input_dir, args.samples_per_row)

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

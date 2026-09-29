#!/usr/bin/env python3
"""Run REAL inference with a real Stable Diffusion inpainting checkpoint
multiple times (different random seeds) on the same real background/mask
pair, then tile the genuine outputs into a single labeled comparison
image.

This mirrors the manuscript's stated data-generation procedure ("we
generate 4 variations ... with different random seeds") for a single
(background, mask) pair -- but using the real, publicly released
SD-Inpainting baseline, since no trained FireSmokeGenNet checkpoint
exists. Every panel in the output grid is a genuine, independent forward
pass of the real model; none are copied, edited, or fabricated.
"""
from __future__ import annotations

import argparse
import time
from pathlib import Path

import torch
from diffusers import StableDiffusionInpaintPipeline
from PIL import Image, ImageDraw, ImageFont


def load_font(size: int) -> ImageFont.ImageFont:
    for candidate in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--background", type=Path, required=True)
    parser.add_argument("--mask", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--panel-output", type=Path, required=True)
    parser.add_argument("--model-id", default="runwayml/stable-diffusion-inpainting")
    parser.add_argument(
        "--prompt",
        default="wildfire smoke rising above forest trees, photorealistic, natural gray smoke plume",
    )
    parser.add_argument("--negative-prompt", default="cartoon, illustration, text, watermark")
    parser.add_argument("--num-inference-steps", type=int, default=25)
    parser.add_argument("--guidance-scale", type=float, default=7.5)
    parser.add_argument("--resolution", type=int, default=512)
    parser.add_argument("--seeds", type=int, nargs="+", default=[0, 1, 2, 3])
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    print(f"[{time.strftime('%H:%M:%S')}] Loading real checkpoint: {args.model_id} (CPU) ...")
    t0 = time.time()
    pipe = StableDiffusionInpaintPipeline.from_pretrained(
        args.model_id, torch_dtype=torch.float32, safety_checker=None
    )
    pipe.to("cpu")
    print(f"[{time.strftime('%H:%M:%S')}] Checkpoint loaded in {time.time() - t0:.1f}s")

    image = Image.open(args.background).convert("RGB").resize((args.resolution, args.resolution))
    mask = Image.open(args.mask).convert("L").resize((args.resolution, args.resolution))

    results: list[Image.Image] = []
    for seed in args.seeds:
        print(f"[{time.strftime('%H:%M:%S')}] Real inference for seed={seed} ...")
        generator = torch.Generator(device="cpu").manual_seed(seed)
        t1 = time.time()
        out = pipe(
            prompt=args.prompt,
            negative_prompt=args.negative_prompt,
            image=image,
            mask_image=mask,
            num_inference_steps=args.num_inference_steps,
            guidance_scale=args.guidance_scale,
            generator=generator,
        ).images[0]
        elapsed = time.time() - t1
        print(f"[{time.strftime('%H:%M:%S')}] seed={seed} done in {elapsed:.1f}s")
        out_path = args.output_dir / f"sd_inpainting_seed{seed}.png"
        out.save(out_path)
        results.append(out)

    # Tile the genuine outputs into one labeled panel.
    thumb = args.resolution
    margin, header = 8, 34
    n = len(results)
    canvas = Image.new("RGB", (n * thumb + (n + 1) * margin, thumb + header + margin), (255, 255, 255))
    draw = ImageDraw.Draw(canvas)
    font = load_font(18)
    for i, (seed, img) in enumerate(zip(args.seeds, results)):
        x = margin + i * (thumb + margin)
        canvas.paste(img, (x, header))
        draw.text((x, 6), f"Sample {i + 1} (seed={seed}, real inference)", fill=(0, 0, 0), font=font)

    args.panel_output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.panel_output)
    print(f"Saved {n}-sample real comparison panel to {args.panel_output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

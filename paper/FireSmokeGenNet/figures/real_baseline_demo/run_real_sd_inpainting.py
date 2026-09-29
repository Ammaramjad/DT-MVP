#!/usr/bin/env python3
"""Run REAL inference with a real, publicly-released Stable Diffusion
inpainting checkpoint on a real (CC0-licensed) background photo and a
hand-authored test mask.

This produces a genuine "Stable Diffusion / SD-Inpainting" baseline
output. It does NOT produce a FireSmokeGenNet output (no such trained
model exists) and does NOT reproduce PowerPaint/BLD/FlameDiffuser (each
would require its own specific released checkpoint and code, not wired
up here).

Background provenance: Forest_sunrise.jpg by Peter Heeling, CC0 1.0,
downloaded from Wikimedia Commons.
Mask provenance: hand-authored synthetic plume-shaped test mask created
in this session (NOT a real annotated mask from FLAME/HPWREN/SMOKE5K).
"""
from __future__ import annotations

import argparse
import time
from pathlib import Path

import torch
from diffusers import StableDiffusionInpaintPipeline
from PIL import Image


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--background", type=Path, required=True)
    parser.add_argument("--mask", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--model-id",
        default="runwayml/stable-diffusion-inpainting",
        help="Real, publicly released HF checkpoint id.",
    )
    parser.add_argument("--prompt", default="wildfire smoke rising above forest trees, photorealistic, natural gray smoke plume")
    parser.add_argument("--negative-prompt", default="cartoon, illustration, text, watermark")
    parser.add_argument("--num-inference-steps", type=int, default=25)
    parser.add_argument("--guidance-scale", type=float, default=7.5)
    parser.add_argument("--resolution", type=int, default=512)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    print(f"[{time.strftime('%H:%M:%S')}] Loading real checkpoint: {args.model_id} (CPU) ...")
    t0 = time.time()
    pipe = StableDiffusionInpaintPipeline.from_pretrained(
        args.model_id,
        torch_dtype=torch.float32,
        safety_checker=None,
    )
    pipe.to("cpu")
    print(f"[{time.strftime('%H:%M:%S')}] Checkpoint loaded in {time.time() - t0:.1f}s")

    image = Image.open(args.background).convert("RGB").resize((args.resolution, args.resolution))
    mask = Image.open(args.mask).convert("L").resize((args.resolution, args.resolution))

    generator = torch.Generator(device="cpu").manual_seed(args.seed)

    print(
        f"[{time.strftime('%H:%M:%S')}] Running REAL inference: "
        f"{args.num_inference_steps} steps, guidance={args.guidance_scale}, "
        f"resolution={args.resolution}x{args.resolution} ..."
    )
    t1 = time.time()
    result = pipe(
        prompt=args.prompt,
        negative_prompt=args.negative_prompt,
        image=image,
        mask_image=mask,
        num_inference_steps=args.num_inference_steps,
        guidance_scale=args.guidance_scale,
        generator=generator,
    ).images[0]
    elapsed = time.time() - t1
    print(f"[{time.strftime('%H:%M:%S')}] Inference finished in {elapsed:.1f}s ({elapsed/60:.1f} min)")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.save(args.output)
    print(f"Saved REAL SD-Inpainting output to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

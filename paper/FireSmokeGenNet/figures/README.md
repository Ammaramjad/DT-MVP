# Figure 7 & Figure 8 tooling (`qualitative_ablation.pdf` / `qualitative_comparison.pdf`)

The manuscript (`../manuscript/bare_jrnl.tex`) references two figures that
are guarded with `\IfFileExists{...}{...}{\PackageError{...}}`:

- **Figure 7** (`\label{fig:ablation_vis}`) — `qualitative_ablation.pdf`
- **Figure 8** (`\label{fig:qualitative}`) — `qualitative_comparison.pdf`

Neither file exists anywhere in the source you provided, and the
`\PackageError` fallback text says explicitly: *"Upload the experimentally
generated qualitative ablation/comparison panel before submission."* In
other words, LaTeX itself will refuse to compile a figure here until real
generated images are supplied — these are placeholders for genuine
experimental outputs, not decorative artwork.

**We will not fabricate stand-in "smoke" images and label them as if they
were real outputs of FireSmokeGenNet, SD-Inpainting, PowerPaint, BLD, or
FlameDiffuser.** Doing so would misrepresent synthetic placeholder content
as genuine experimental evidence in an academic manuscript. Instead, this
folder provides the tooling to assemble the two figures correctly **once
you have real generated images** from your own trained checkpoints.

## What's here

```
figures/
  scripts/
    generate_qualitative_figures.py     # scaffold: wire up your real checkpoints here
    compose_qualitative_ablation.py      # tiles real images into Figure 7
    compose_qualitative_comparison.py    # tiles real images into Figure 8
    requirements.txt
  selftest_assets/                       # placeholder swatches used ONLY to
                                          # unit-test the compose scripts
                                          # (never used for the real figures)
```

## Step 1 — Produce the raw per-cell images

You need real inference outputs from:

- The **five** ablation conditions for Figure 7: `no_jca`, `no_mrdl`,
  `no_resnet50`, `no_filtering`, `full_model` (matches the bullet list in
  Section VI-F, "Qualitative Ablation Visualizations").
- The **six** methods for Figure 8: `stable_diffusion`, `powerpaint`,
  `sd_inpainting`, `bld`, `flamediffuser`, `firesmokegennet` (matches
  Table `tab:quantitative`, Section VI-A), across 3 successful scenes + 1
  failure-case scene (matches the caption "Rows 1-3: Successful
  generations. Row 4: Failure cases").

`generate_qualitative_figures.py` is a scaffold with the directory
structure and CLI already wired up. Fill in `ABLATION_CHECKPOINTS` /
`BASELINE_CHECKPOINTS` with your real checkpoint paths and implement
`run_inference()` with your actual model-loading/sampling code (e.g.
`diffusers` pipelines for the baselines, your FireSmokeGenNet wrapper for
the ablation variants). It raises `NotImplementedError` until you do this,
by design.

## Step 2 — Assemble the figures

Once the raw images exist on disk in the expected layout (see the
docstrings in each script for the exact folder structure), run:

```bash
pip install -r scripts/requirements.txt

python scripts/compose_qualitative_ablation.py \
    --input-dir /path/to/ablation_images \
    --output-pdf qualitative_ablation.pdf \
    --output-png qualitative_ablation.png

python scripts/compose_qualitative_comparison.py \
    --input-dir /path/to/comparison_images \
    --output-pdf qualitative_comparison.pdf \
    --output-png qualitative_comparison.png
```

Place the resulting `qualitative_ablation.pdf` and
`qualitative_comparison.pdf` alongside `bare_jrnl.tex` (or update the
`\graphicspath`) so the `\IfFileExists` guards resolve and Figures 7 & 8
compile.

## Self-test (does NOT produce the real figures)

`selftest_assets/` contains a small script-generated set of neutral
labeled color swatches (not smoke, not claimed to be real data) used only
to verify that the two `compose_*.py` scripts correctly read a directory
tree and tile/label it into a PDF+PNG. See `selftest_assets/README.md`.

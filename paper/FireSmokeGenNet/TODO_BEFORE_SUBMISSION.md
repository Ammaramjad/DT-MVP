# Status: content pending real experimental data

This directory holds the `FireSmokeGenNet` manuscript source
(`manuscript/bare_jrnl.tex`, saved verbatim from the draft) and tooling to
assemble two of its figures. It intentionally does **not** contain
fabricated results. Before this manuscript is submitted anywhere, the
following items need real experimental evidence:

## Figures 7 & 8 (blocking — LaTeX will not compile without them)

- **Figure 7** (`\label{fig:ablation_vis}`, "Qualitative ablation
  results") and **Figure 8** (`\label{fig:qualitative}`, "Qualitative
  comparison") are wrapped in `\IfFileExists{...}{...}{\PackageError{...}}`
  in the manuscript. The referenced files `qualitative_ablation.pdf` and
  `qualitative_comparison.pdf` do not exist anywhere in the source.
- `figures/README.md` explains the tooling provided
  (`figures/scripts/generate_qualitative_figures.py`,
  `compose_qualitative_ablation.py`, `compose_qualitative_comparison.py`)
  to assemble these two figures **from real generated images**, once real
  checkpoints for FireSmokeGenNet (full model + 4 ablation variants) and
  the baselines (Stable Diffusion, PowerPaint, SD-Inpainting, BLD,
  FlameDiffuser) are available.
- We deliberately did not generate placeholder/synthetic "smoke" images to
  fill these figures, since doing so would misrepresent fabricated content
  as genuine experimental results.

## Numeric results in Section VI (needs verification against real runs)

The manuscript currently reports specific numeric results (e.g., Table
`tab:quantitative` PSNR/SSIM/LPIPS/CLIP-Sim; Table `tab:detection`
mAP@50/mAP@50-95/Precision/Recall across YOLOv6-v13; Table
`tab:domainshift` cross-domain mAP@50; Table `tab:ablation` component
ablation; Table `tab:filter_threshold` retention-threshold sweep; Fig.
`fig:mrdl_sensitivity` MRDL weight sensitivity). Before submission, confirm
each of these numbers traces back to an actual completed experiment run
(with logs/checkpoints retained), rather than being placeholder or
illustrative values. If any table/figure was drafted before the
corresponding experiment was run, mark it explicitly as pending and
replace it with the measured result once available.

## Suggested workflow

1. Train the full `FireSmokeGenNet` model and the four ablation variants
   (`no_jca`, `no_mrdl`, `no_resnet50`, `no_filtering`) described in
   Section IV/V.
2. Train or obtain the baseline checkpoints (Stable Diffusion inpainting,
   PowerPaint, SD-Inpainting, BLD, FlameDiffuser) referenced in Table
   `tab:quantitative`.
3. Re-run the quantitative evaluation protocol in Section V-C and record
   real PSNR/SSIM/LPIPS/CLIP-Sim, FID/MMD/Wasserstein, boundary-softness,
   and downstream-detection numbers; update the tables in Section VI with
   the measured values (or flag discrepancies for revision).
4. Use `figures/scripts/generate_qualitative_figures.py` (after filling in
   real checkpoints and implementing `run_inference()`) to produce the raw
   per-cell images for Figures 7 & 8, then run the two `compose_*.py`
   scripts to assemble the final panels.
5. Re-run `figures/selftest_assets/make_selftest_inputs.py` +
   `compose_*.py` on real output directories as a smoke-test that the
   directory layout matches what the compositing scripts expect, before
   doing a full compile of `bare_jrnl.tex`.

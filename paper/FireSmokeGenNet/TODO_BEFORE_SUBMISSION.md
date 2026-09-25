# Status: content pending real experimental data

This directory holds the `FireSmokeGenNet` manuscript source
(`manuscript/bare_jrnl.tex`), a bibliography (`manuscript/ref.bib`), and
tooling to assemble two of its figures. It intentionally does **not**
contain fabricated results. Before this manuscript is submitted anywhere,
the items below need real experimental evidence.

## Revision history

- **Round 2 (current):** Addressed a full reviewer assessment ("Major
  revision") covering citation/compile blockers, reproducibility gaps, and
  statistical/methodological rigor. See "Round 2 changes" below for what
  was fixed vs. what is still pending real data.
- **Round 1:** Added `figures/scripts/` tooling to assemble Figures 7 & 8
  from real generated images once available (see `figures/README.md`).

## Round 2 changes (this revision)

### Fixed (do not require new experiments)

- **Citation blocker resolved.** Added `manuscript/ref.bib` with verified
  bibliographic entries for every `\cite{}` key in the manuscript,
  including real, verified entries for YOLOv12 (Tian, Ye & Doermann, 2025,
  arXiv:2502.12524) and YOLOv13 (Lei et al., 2025, arXiv:2506.17733), which
  were previously rendering as `Tian et al. [?]` / `Lei et al. [?]`.
  **Verified by local compile** (`pdflatex` + `bibtex`, TeX Live 2023,
  IEEEtran.cls): the manuscript now compiles to a 21-page PDF with **zero**
  `[?]` markers and zero undefined references/citations across three
  `pdflatex` passes. Two bib entries (`7823512`, `los1998high`) are marked
  `NEEDS VERIFICATION` in `ref.bib` because an exact source could not be
  conclusively confirmed by automated search; cross-check these against the
  original Overleaf project's `ref.bib` before submission.
- **Two additional real rendering bugs found via compile-testing and
  fixed:**
  1. Table XIV ("Ablation of architectural components") was a narrow
     single-column table whose longer row labels (e.g., "No ResNet50
     (random init)") wrapped and visually overlapped with the neighboring
     Table XII in the adjacent two-column layout position -- this is the
     exact defect the reviewer flagged for the "No MRDL" row, and it was
     worse than described (genuine overlapping/garbled text, confirmed by
     rendering the compiled PDF to images). Fixed by converting the table
     to a double-column-spanning `table*` and adding `\FloatBarrier`s
     (via the `placeins` package) at several points so later floats no
     longer collide with earlier ones.
  2. The two-author byline used `\and`, which is only valid in IEEEtran's
     conference/peer-review modes; in journal mode it silently produced no
     separator, rendering as "IEEE,Kenny Lin" with no space. Fixed by using
     a plain comma-separated author list (the standard IEEEtran
     journal-mode format).
- `\method` macro spacing bug fixed (`\method synth` rendered as
  "FireSmokeGenNetsynth" because LaTeX control words gobble a trailing
  space); also unified the two different citation keys
  (`wang2024flame` / `wang2024flamediffuserwildfireimage`) that both
  referred to FlameDiffuser into one.
- Title moderated from "...for Wildfire-Smoke Monitoring" to "...for
  Wildfire-Smoke Detection", since no time-to-alarm/early-detection
  experiment is reported (Section VII-F5 spells out what such a study
  would require).
- Removed the unsupported "5--8%" / "3--5%" failure-rate percentages in
  Section VII (no defined denominator/evaluation set/confidence interval
  existed for them); replaced with "observed in some generated samples"
  per the reviewer's specified fallback.
- Fixed the "8.1% improvement" ambiguity in the conclusion: the true
  computation was a percentage-point difference (0.829 - 0.748 = 0.081)
  mislabeled as a percent; now reported as "8.1 percentage points (a
  10.8% relative improvement)" with the exact formula shown
  (Eq. `filtering_relative_improvement`).
- MRDL morphology clarified: `k` and `N` are now explicitly stated to be
  drawn from **discrete** uniform distributions, and the resulting
  `(2k+1)x(2k+1)` structuring-element size is spelled out numerically
  (e.g., k=10 -> 21x21) to remove any radius/diameter ambiguity.
- Resolved the "Fixed seed (42)" vs. "four seeds per pair" contradiction:
  the fixed seed is now explicitly scoped to deterministic
  qualitative/quantitative comparisons only, not to the 96,000-image
  corpus generation.
- "Nearly identical to real smoke" reworded to "closest to the real-smoke
  reference among the evaluated methods" (a lower KL divergence is not
  evidence of distributional identity, and low boundary-softness alone can
  also result from blurring).
- `mAP@50-95` vs. `mAP@50--95` unified to the en-dash form everywhere.
- Figure 6 (MRDL weight sensitivity) width increased from `0.45\textwidth`
  to `0.95\columnwidth` for legibility.
- Fixed a duplicate FlameDiffuser bib-key inconsistency and a
  ResNet-50-vs-CLIP-ViT-H/14 feature-extractor inconsistency between the
  Methodology and Results sections (flagged explicitly as
  `PENDING VERIFICATION` since only one of the two can be correct).

### Added structure requiring real data before the placeholders can be
### removed (all clearly marked `[PENDING VERIFICATION]` / `[bracketed]`
### in the manuscript itself -- values must never be guessed)

- A prominent editorial notice at the top of Section VI stating that
  every numeric value in the Results section (generative-quality,
  distribution-alignment, boundary-softness, five-run domain-shift
  statistics, the `p<0.01` claim, and the qualitative figures) is a
  placeholder pending verified experiments, per the reviewer's explicit
  instruction to either remove such values or label the section as a
  proposed evaluation protocol.
- A dedicated **Detector Training Configuration** table (Table V).
  Table II/III describe the *diffusion generator's* training, not the
  YOLO detectors', which the previous revision conflated.
- A **YOLOv12/YOLOv13 Configurations** paragraph following the reviewer's
  exact suggested template, with real citations plugged in and every
  configuration value (variant/scale, commit/tag, resolution, batch size,
  optimizer, LR, epochs, pretrained weights, augmentation, thresholds,
  early stopping, seeds, hardware) left as an explicit bracket to fill
  from real logs.
- A **Dataset Splits and Leakage Control** subsection specifying exactly
  what must be reported: train/val/test sizes, official-vs-custom splits,
  scene/video-level (not frame-level) leakage control, duplicate-frame
  handling, background/mask overlap between synthetic-data splits, the
  composition of the "fixed base dataset," and the value of `N` in the
  real-vs-synthetic comparison.
- A **mask-selection procedure** clarification: how 3 of the 60,000 masks
  are chosen per background, with/without-replacement policy, and whether
  a mask can appear in both training and evaluation.
- A **PSNR/SSIM/LPIPS comparison protocol** definition: what exactly is
  compared (paired real target vs. preserved-background region vs. mask
  region), spatial alignment, and pixel-value range/color space.
- A **baseline reproducibility table** (Table VI) covering
  checkpoint/version, prompt template, mask preprocessing, sampling
  method/steps, guidance scale, output resolution, fine-tuning status,
  sample count, and filtering, for every baseline (SD, PowerPaint,
  SD-Inpainting, BLD, FlameDiffuser, GAN baseline).
- A **statistical testing protocol**: paired-observation definition, the
  5 random seeds, justification for test choice (paired permutation or
  Wilcoxon signed-rank recommended over a paired t-test given n=5),
  exact per-row p-values, effect sizes/CIs, and a multiple-comparison
  correction (6 tests: 3 domain shifts x 2 metrics).
- A **VLM annotation protocol**: annotator count/expertise, coverage,
  disagreement resolution, whether Fleiss' kappa's categorical
  assumption is being violated by continuous 0-10 scores (an ICC is
  recommended instead if so), the 150-image train/val/test split, and
  held-out prediction error/correlation.
- A **complete distribution-metric definition**: exact CLIP checkpoint,
  feature layer, normalization, image counts, sampling procedure,
  FD covariance regularization and numerical implementation, an explicit
  2-Wasserstein closed form, whether MMD is squared, and a request for
  confidence/bootstrap intervals.
- A **complete boundary-metric definition**: color space/grayscale
  conversion, gradient operator (Sobel/Scharr/finite-difference),
  pixel-value normalization, border handling, KL-divergence histogram
  binning/smoothing, sample size/averaging procedure, and uncertainty
  estimates.
- A **proposed equal-size filtering control** (Table XV: Top-ranked /
  Random / Bottom-ranked / Stratified, all at N=28,800) to isolate the
  effect of VLM-based ranking from the dataset-size confound in the
  filtering-threshold sweep (Table XVI); all cells are `[PENDING]` and
  require a completed YOLOv13 training run.

## Figures 7 & 8 (blocking -- LaTeX will not compile a real result without them)

Unchanged from Round 1: `qualitative_ablation.pdf` and
`qualitative_comparison.pdf` still do not exist. See `figures/README.md`
for the compositing tooling that assembles them from **real** generated
images once available; no synthetic/stock imagery has been substituted.

## Page length

This revision added substantial required-but-currently-placeholder
methodological detail, growing the manuscript to 21 pages when compiled
locally (TeX Live 2023, IEEEtran journal mode, single-column figures at
the sizes specified in the source). Check the target journal's page
limit and overlength charges; once the `[PENDING VERIFICATION]` sections
are replaced with final confirmed values/results (often shorter than the
placeholder bullet lists), the final length will change and should be
re-checked.

## Suggested workflow

1. Train the full `FireSmokeGenNet` model and the four ablation variants
   (`no_jca`, `no_mrdl`, `no_resnet50`, `no_filtering`) described in
   Section IV/V.
2. Train or obtain the baseline checkpoints (Stable Diffusion inpainting,
   PowerPaint, SD-Inpainting, BLD, FlameDiffuser) referenced in Table VI,
   and fill in Table VI's reproducibility fields.
3. Re-run the quantitative evaluation protocol in Section V using the
   now-fully-specified PSNR/SSIM/LPIPS, distribution-metric, and
   boundary-metric protocols, and update every table in Section VI with
   the measured values.
4. Run the proposed equal-size filtering control (Table XV) and the
   statistical testing protocol (5 seeds, paired permutation/Wilcoxon,
   effect sizes, multiple-comparison correction) for the domain-shift
   claims.
5. Fill in the Detector Training Configuration table (Table V) and the
   YOLOv12/YOLOv13 configuration paragraph from real training logs.
6. Use `figures/scripts/generate_qualitative_figures.py` (after filling
   in real checkpoints and implementing `run_inference()`) to produce the
   raw per-cell images for Figures 7 & 8, then run the two `compose_*.py`
   scripts to assemble the final panels.
7. Recompile with `pdflatex`/`bibtex` (as verified locally for this
   revision) and re-render each page to confirm no float/layout
   collisions were introduced when the placeholder text is replaced with
   final, typically shorter, confirmed content.

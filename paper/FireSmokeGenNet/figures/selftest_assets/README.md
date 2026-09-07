# Self-test assets

`make_selftest_inputs.py` generates plain labeled color swatches (clearly
marked "SELFTEST PLACEHOLDER") used only to verify that
`compose_qualitative_ablation.py` and `compose_qualitative_comparison.py`
correctly read a directory tree and tile/label it into a PDF+PNG.

These swatches are **not** smoke imagery and must never be used as, or
mistaken for, the real Figure 7 / Figure 8 content. They exist purely to
exercise the compositing code path without requiring real trained
checkpoints.

Run:

```bash
python make_selftest_inputs.py \
    --ablation-out /tmp/ablation_selftest \
    --comparison-out /tmp/comparison_selftest

python ../scripts/compose_qualitative_ablation.py \
    --input-dir /tmp/ablation_selftest \
    --output-pdf /tmp/ablation_selftest_panel.pdf \
    --output-png /tmp/ablation_selftest_panel.png

python ../scripts/compose_qualitative_comparison.py \
    --input-dir /tmp/comparison_selftest \
    --output-pdf /tmp/comparison_selftest_panel.pdf \
    --output-png /tmp/comparison_selftest_panel.png
```

If both commands complete without error and produce non-empty PDF/PNG
files with the expected grid dimensions, the compositing tooling is
working correctly and is ready to be pointed at real generated images.

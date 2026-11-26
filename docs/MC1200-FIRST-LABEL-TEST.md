# MC1200 first-label acceptance test

This procedure validates one controlled sample before the complete customer test order. It does not assume that the MC1200 has an optical registration sensor.

## Test sample

- Artwork: MAMA'S KITCHEN / JOLLOF SPICE
- Finished shape: circle
- Finished trim size: 50 × 50 mm
- Bleed: 3 mm on every edge
- SVG page size: 56 × 56 mm
- Cutter mode: manual alignment; no registration marks
- Colour: RGB SVG master; printer/RIP operator confirms the device-specific ICC conversion

## Files from Studio Dashboard → Production artwork exporter

1. Export the print artwork SVG.
2. Export the cutline SVG.
3. Keep both files together. They must retain identical 56 × 56 mm page dimensions and must not be independently scaled.

## CorelDRAW checks

- Open the print SVG and confirm the page is 56 × 56 mm.
- Confirm the finished label artwork/trim geometry is centred and the bleed extends 3 mm beyond the trim edge.
- Open/import the cutline SVG as a separate aligned object or layer.
- Confirm its circle is 50 mm in diameter and concentric with the print artwork.
- Do not send the cutline stroke to the printer as visible ink.
- Inspect font substitution and spacing. Convert text to curves in the production CDR copy if the workstation requires it.
- Save a native CDR working copy from CorelDRAW. The web app exports SVG; it does not generate native CDR.
- Confirm printer/RIP colour conversion and material settings with the operator. Do not treat RGB HEX values as a CMYK colour proof.

## MC1200 cut test

- Confirm the actual cutter software, connection and supported file/command format.
- Use manual alignment for this first run unless the machine's optical sensor and contour-cut workflow have been physically confirmed.
- Load a small offcut of the intended sticker stock and verify origin, scale and media feed before cutting the sample.
- Run one low-risk test cut; adjust blade exposure, force, speed and offset only with the operator's normal calibration procedure.
- Check that the cut is closed, centred, clean and does not cut through the backing liner.
- Measure the finished sample with a ruler or caliper. Target: 50 × 50 mm nominal trim (circle diameter 50 mm).
- Record material, printer/RIP profile, cutter software, blade, force, speed, offset, operator and measured result.

## Pass criteria

- CorelDRAW opens both SVG files without an import error.
- Print page is 56 × 56 mm; cut path is a centred 50 mm circle.
- Print and cut files remain at the same scale and alignment.
- Printed colour/coverage is accepted by the operator for the selected material.
- MC1200 cuts the contour cleanly, centred, with backing intact.
- The physical sample measures to the agreed tolerance.

A successful SVG download or CI build is not a physical pass. Mark this milestone complete only after the actual print and cut sample is inspected and accepted. If the MC1200 has CCD/ARMS, record the exact sensor/software model before adding registration marks to the export.

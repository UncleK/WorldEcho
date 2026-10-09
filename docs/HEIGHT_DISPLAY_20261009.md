# Exhibition height differentiation · 2026-10-09

Release `worldecho-height-20261009024122` replaces the uniform height used for 327 of the 391 public models. The prior minimum also flattened small known towers: a 1m and a 20m tower displayed only about 1.29 times apart. A gentler display floor and power curve retain Paris near .28 while making those sizes about 3.3 times apart. This remains an exhibition scale, with independent linear height comparison.

The immutable `data/visual-height-estimates.v1.json` layer records 291 unadopted source-height references, 33 photo-estimate ranges and three user estimates. User estimates, supplied in photo order: Toronto lantern festival ≈50m, Lembang MiniMania ≈35m, Semarang bamboo lead ≈36m. Source conflicts and photo perspective assumptions remain documented; range midpoints used for display are not new measurements.

Canonical height, coordinate and status fields remain unchanged. Adopted heights always take priority. References and estimates are labeled in globe/archive details and do not enter factual rankings, sorting or strict same-scope comparison. Model geometry and existing rendered portraits remain unchanged.

Validation: 96 Node tests, 12 targeted checks after the user's three values, 40 public snapshot tests and builds passed. Eleven production-build browser checks covered actual rendering, source/photo/user labels, unchanged null heights, archive evidence, 393px layout and every model at 10% scale. Desktop Chrome emulation is separate from physical Android/Safari acceptance. No third-party gallery photographs are newly bundled in this public source snapshot.

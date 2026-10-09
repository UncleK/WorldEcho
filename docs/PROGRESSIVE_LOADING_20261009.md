# Progressive loading and mobile refinement · 2026-10-09

Production release: `worldecho-progressive-20261009004022`. [Explore](https://worldecho.beaverstudio.net/zh/) · [Satellite night view](https://worldecho.beaverstudio.net/zh/?style=satellite&sky=night).

The HTML shell shows a globe immediately. WebGL then renders the sphere and land before the catalog finishes. Selected and camera-facing buildings are constructed in small batches with a paint opportunity between batches. Model recipes still arrive as a shared script; this is incremental geometry creation, not one network request per model.

Dragging the exhibition scale previews transforms on existing models. Release applies clustering and constructs newly exposed models incrementally. Floating filters and style controls fit the visual viewport and scroll internally.

Satellite night retains visible ground color, normal-dependent lighting and reflection. The small base surface map appears first; close views request the original 4096×2048 surface data. Its lossless WebP decodes to exactly the original JPEG's decoded RGB. Attribution and hash are in `public/assets/earth-realism/detail-source.json`; visual bump has no metre-based terrain or DEM contract.

Validation: 91 primary tests, 37 isolated backend tests, 38 public snapshot tests and builds passed. Controlled 18-second data delay showed the shell, sphere, land and successive building batches. Native pointer drags and short-screen internal scrolling were checked in desktop Chrome. Production checks covered all current JS/CSS bytes, complete JSON, new detail assets and six entrypoints (62 checks); ten live browser checks covered actual WebGL, night close-ups, all 391 models at 10% scale and the mobile archive.

391 public model cases, 540 canonical display places and 554 research records remain unchanged. No production submission was created. Narrow viewports are desktop browser emulation; physical Android/Safari acceptance remains separate. This developer snapshot continues to exclude bundled third-party gallery photos and production administration data.

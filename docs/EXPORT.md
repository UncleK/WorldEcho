# Public World Echo source export

This repository is a standalone frontend and reviewed runtime snapshot. The live project is [World Echo](https://worldecho.beaverstudio.net/). It does not contain the private research workspace, deployment configuration or community database.

## Run locally

Use Node.js 24 or later and the pnpm version in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm preview
```

The globe, models, authored portraits, translations and fact/source tables load locally. Runtime tower photographs are external URLs on the live website and require network access. Their authors and individual rights statements remain in the runtime data; raw tower-photo files are excluded from GitHub. The complete user-provided app recording and its poster may display reference imagery which retains its original attribution and rights. If a remote photograph is unavailable, its source link and the local model remain available.

The community dialog in this copy explains that submissions are disabled and links to the official website. It neither collects local uploads nor forwards visitor data to production. A backend is not required for browsing the public frontend.

## What is included

- The React/TypeScript/Three.js frontend, local unit tests and a minimal Vite setup.
- Procedural model parameters, night palettes/programmes and imported localization fragments. Local research caches and superseded private evidence snapshots are removed from these runtime files.
- Compiled catalog and research snapshots, with source links, uncertainty labels, model collections and the final approximate-position display layer when present.
- Self-rendered tower portraits, World Echo brand artwork, Natural Earth polygons and prepared Earth textures with their attribution notices.
- The current quiz definition, using external photo URLs, and the retirement list. Historical quiz archives and photo image files are not bundled.

Exact accepted coordinates and approximate exhibition locations remain different fields. Approximate markers are not surveyed tower locations. This developer build emits no geographic structured data or production sitemap, so display-marker counts cannot silently become precise geographic SEO claims.

`PUBLIC_EXPORT_MANIFEST.json` records each exported file, its content hash, size and source category. `NOTICE.md`, `THIRD_PARTY_ASSETS.md` and `COPYRIGHT.md` describe the rights boundaries. The current code licence is `UNLICENSED`; individually licensed assets retain their own terms.

## Snapshot and portrait regeneration

`pnpm build` checks snapshot/model references and bundled portrait hashes, then builds local language and place-entry shells. These checks establish a runnable public snapshot. They do not substitute for the main project's research, model/photo approval, full regression or publication gates.

The model implementation is `src/scene/tower-model.ts`; parameters are in `data/model-batch100.json`. Night designs and photo-referenced palettes remain separate JSON inputs. Metadata-only export cleaning does not change the model parameters.

For a local model experiment, open `/tools/portrait-studio.html?model=paris&view=front` on the development server. `view` also accepts `side` and `axonometric`. The page uses the same `renderTowerPortrait` function as the application, produces a transparent 960×1320 canvas, and can be saved as PNG through browser developer tools:

```js
const canvas = document.querySelector('#portrait-canvas');
const a = document.createElement('a');
a.href = canvas.toDataURL('image/png');
a.download = 'model-front.png';
a.click();
```

If replacing bundled portraits, update their URLs and SHA-256 values in the portrait manifest and catalog model views. Keep the original source-photo review and clearly label inferred geometry. The public copy deliberately omits the private photo acquisition and release scripts; publishing new evidence-backed entries still requires the main review workflow.

The README cover, model grid and navigation artwork can be regenerated from the bundled model portraits. Run from the public repository root:

```sh
pnpm showcase:generate
```

The entry point is `docs/generate-showcase-assets.mjs`; it reads the local portrait manifest, verifies the selected render hashes and writes `docs/assets/`. Its `sharp` dependency is locked in the public package. The script composes the artwork in code without fetching external photographs. The user-recorded MP4 is preserved separately and is not synthesized by this generator.

## Maintainer refresh

From the authoring workspace, run:

```sh
node scripts/prepare-public-worldecho.mjs
```

The script writes `.local/public-worldecho/WorldEcho` beneath that workspace. It does not initialize Git, create a GitHub repository, push or deploy. It uses an explicit allowlist, checks all source hashes again after export and writes a private export/scan report beside the copy. Refresh only after the intended main snapshot is compiled and reviewed; then repeat installation, tests and build in the exported directory.

README and showcase artwork originate in `docs/public-worldecho/README.md`, `README.zh-CN.md`, `README.fr.md`, `generate-assets.mjs` and `assets/`. They become three root READMEs (English by default), `docs/generate-showcase-assets.mjs` and `docs/assets/` in the public copy. Showcase images use the project’s own 3D/brand visuals, including the user-approved globe screenshot. The user-provided `hat-flight.mp4` recording and its poster are explicitly approved for this GitHub showcase and are copied as MP4 without GIF conversion or cropping. The photograph library itself is still not bundled.

The export report lists files larger than 5 MiB for review; this is informational. The approximately 40 MB approved MP4 is allowed. Files at or above 100 MiB fail the export gate.

Refresh writes only allowlisted exporter paths. It does not delete files. Obsolete files are reported as `obsoleteCandidates` with complete paths, current and previous hashes, and an unchanged/modified flag. They require a separate Windows path-and-attribute check and explicit `Remove-Item -LiteralPath` cleanup before rerunning the export. `.git`, dependency installations and build output are never copied from the authoring workspace or recursively deleted.

## Deliberate exclusions

Environment files, keys, SSH details, admin UI, private host configuration, deployment/service logs, release packages, community SQLite files, contributor uploads, fetched page bodies, research working files and raw tower-photo files are excluded. The public Vite configuration has no proxy to a production or private backend.

This boundary preserves the main release checks: the public build is a developer preview, while the authoring project retains the full evidence, visual approval and production validation requirements.

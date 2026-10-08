https://github.com/user-attachments/assets/e99b04a6-173a-4352-9c4f-7e2346a0e871

<p align="center"><a href="https://worldecho.beaverstudio.net/?lang=en"><img src="docs/assets/nav-explore.svg" alt="Explore the globe" width="32%"></a><a href="https://worldecho.beaverstudio.net/catalog.html?lang=en"><img src="docs/assets/nav-archive.svg" alt="Browse the archive" width="32%"></a><a href="README.md"><img src="docs/assets/nav-language-en.svg" alt="English" width="12%"></a><a href="README.zh-CN.md"><img src="docs/assets/nav-language-zh.svg" alt="中文" width="12%"></a><a href="README.fr.md"><img src="docs/assets/nav-language-fr.svg" alt="Français" width="12%"></a></p>

<p align="center"><a href="https://worldecho.beaverstudio.net/?lang=en"><img src="docs/assets/worldecho-cover.png" alt="WorldEcho — a small planet, a world of echoes" width="100%"></a></p>

**One Paris landmark. Hundreds of local reinventions. A world small enough to turn with your hand.**

WorldEcho is an interactive atlas of Eiffel replicas, adaptations and related structures. Explore a miniature planet, get close to an individual model, follow its sources, and discover the details that make a familiar shape belong to a particular place.

## Familiar shape, local character

<img src="docs/assets/model-personalities.png" alt="Eight actual WorldEcho model renders showing different structures, materials and crowns" width="100%">

A red cowboy hat in Texas. Yellow beams in Taastrup. A silhouette of rounded stonework. Another made from a living tree. The collection keeps those differences visible, rather than repeating a single Paris model across the map.

Models are drawn from reference imagery. Where an image leaves part of a structure out of view, a proportion-based reconstruction is explicitly labelled **includes inferred completion**. Neither a detailed model nor an accessible photograph establishes a measured height, exact location or current condition.

## A globe with a playful side

[Download the full original recording](docs/assets/hat-flight.mp4) · MP4, about 44 MB.

The recording is provided in full, with its original frame and timing. It shows the actual application, including reference imagery visible in the interface; those photographs retain their own rights.

The main globe has three place-inspired interactions:

| Find | Touch | What happens |
|---|---|---|
| Paris, Texas | The red cowboy hat | A light trail leads a hat flight around the planet. |
| Las Vegas | The tower’s small light | A wave of light turns the globe into a shared night-time stage. |
| Rawa Pening | The bamboo tower’s feet | Ripples travel across the planet and nearby towers catch the waterlight. |

The effects follow the towers currently visible under your filters. Drag to take back the camera, reset to clear the show, or share a link that remembers the selection and effects. Reduced-motion settings are respected. These are playful visual interpretations inspired by places.

## Explore broadly. Keep the evidence visible.

- **Globe:** models for modelled records, markers for other records, with exact and approximate locations distinguished.
- **Collection:** filter by category, setting, historical appearance and available dimensions; related structures remain discoverable.
- **Details:** place information, source links, model context and map directions stay attached to the record.
- **Comparison:** inspect structures together; numerical height comparisons use eligible sourced dimensions and exclude inferred geometry.
- **Archive:** search the research records in Chinese, English or French, including unresolved fields and traceable aliases.
- **Corrections:** help identify a place, refine a location or add a tower from your own town.

The model collection, geographical points and research records are different sets. Counts live in the generated catalogs and may change as aliases are reconciled and sources improve. Approximate map positions are useful starting points and can be corrected; they never replace accepted coordinates silently.

## Run locally

```bash
git clone https://github.com/UncleK/WorldEcho.git
cd WorldEcho
pnpm install
pnpm dev
```

Use Node.js 24 or newer with the pnpm version declared in `package.json`. The browser app uses React, TypeScript, Three.js and React Three Fiber, built with Vite.

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

The public checkout includes code and public data snapshots. Original third-party reference photographs and the private research working archive are not bundled as openly licensed assets. See [the export notes](docs/EXPORT.md) for what is included and how the public build is prepared.

## Built to be inspectable

The project keeps reference images, observed features, inferred additions, model recipes and visual-review decisions distinct. A source-photo comparison and rendered-model review are separate from a code or geometry check. Night lighting is either based on a documented photo palette or described as a locally inspired original design.

The README cover is composed in code around a real WorldEcho globe screenshot; the model wall uses WorldEcho’s own model renders. These two artworks contain no third-party site photographs. Geographic texture attribution and upstream license information remain with the distributed assets. See [credits and licensing](THIRD_PARTY_ASSETS.md) and [project copyright](COPYRIGHT.md).

Regenerate the cover, model wall and navigation graphics from the included screenshot and model renders:

```bash
pnpm showcase:generate
```

<p align="center"><a href="https://worldecho.beaverstudio.net/?lang=en">Open WorldEcho ↗</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.fr.md">Français</a></p>

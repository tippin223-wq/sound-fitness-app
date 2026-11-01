# Sound Fitness head geometry

## Authored full-body revision

The generator now also uses the pinned `base.obj`, young-adult male/female targets, and the CC0 `male_casualsuit06` shirt/pants from MakeHuman's system asset pack. It fits the authored body and garments to the app's joint controls, removes covered body faces, preserves the native UVs, and produces both body profiles. `body-provenance.json` records source locations and SHA-256 hashes. These are asset data, not MakeHuman application code.

`public/models/textures/human-skin.webp` is a 2048px compressed derivative of `young_darkskinned_male_diffuse.png` from the same CC0 pack. Its original hash/source are in `skin-texture-provenance.json`. The renderer uses its facial detail with the existing skin palette and adds small procedural skin/fabric/hair surface maps.

The cotton color, OpenGL normal and roughness maps come from Poly Haven's CC0 Cotton Jersey asset (https://polyhaven.com/a/cotton_jersey; Rico Cilliers / colormass). `fabric-texture-provenance.json` records original URLs and verified MD5 hashes. The renderer uses these real PBR fabric maps, photographed skin color variation, fine pore/hair bump maps, and a generated 128px studio environment. The app makes no external asset requests; all required maps are stored under `public/models/textures/`.

The shirt print reuses Sound Fitness's own crest and the two-line portion of the website footer wordmark, arranged to match https://thesoundfitness.com/client-gear. This brand artwork is separate from the CC0 human assets.

Rebuild without network access: `node scripts/generate-sound-avatar-glb.mjs`. Verify: `npm run test:avatar`. Optional offline asset review: `node scripts/render-sound-avatar-asset.mjs`; this is a geometry render, not a dashboard screenshot.

## Earlier head-only source

Derived from the MakeHuman Community core base mesh, commit a8bc2d54ff0ac92e78ff71431b1023eda42bf482. Only head faces from the body group are retained; helper geometry is excluded. Coordinates are normalized for the Sound Fitness avatar.

Source: https://raw.githubusercontent.com/makehumancommunity/makehuman/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/3dobjs/base.obj

The core graphical assets are CC0-1.0; see LICENSE.CC0.txt and https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md . No MakeHuman application code is incorporated.

The source mesh SHA-256 is recorded in head.json. The app generator reads this local subset and makes no network requests.

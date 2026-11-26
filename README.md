# cuss.ie

The website of CuSS Custom Software Solutions, built with Eleventy and published with GitHub Pages through GitHub Actions.

## Work on it

- `npm ci`, then `npm run dev` serves the site at http://localhost:8080 and rebuilds on save.
- `npm run build` writes the site to `_site/`.
- `npm run shots` re-renders the Work page's demo screenshots (needs ffmpeg).
- `scripts/dev/` holds the local preview server and the headless-browser checks; see its README.

## What's where

| Path | What it is |
|---|---|
| `src/` | Pages, layouts, data and assets; the only folder the build reads |
| `src/_data/` | Site details, services, Work items, contact chips |
| `src/_lib/` | Build helpers: inlined CSS, icons, structured data, share images |
| `design/tokens.json` | Colours, type and spacing, turned into CSS variables at build time |
| `src/CNAME` | The cuss.ie domain, copied into the live build only |

## Publishing

Every push to `main` builds the site and publishes cuss.ie (`.github/workflows/deploy.yml`). Use "Run workflow" by hand only after a failed run. The staging repo runs the same workflow with noindex and the `/cuss-staging/` path.

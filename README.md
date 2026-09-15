# TY Designs — website

Custom gifts and balloon decor, Detroit MI. Static site, no build step.

## Run it
Open `index.html`. No bundler, no npm install.

## GitHub Pages
Already Pages-ready:
- `index.html` is the entry point (a copy of `TY Designs Site.dc.html`)
- `.nojekyll` stops Jekyll from eating any underscore-prefixed paths
- every asset path is relative, so it works from a repo subpath (`user.github.io/repo/`)

Settings → Pages → Deploy from branch → `main` / root.

### Important: the Instagram feed does not run on GitHub Pages
`netlify/functions/instagram.js` is a serverless function. GitHub Pages serves static
files only, so `/api/instagram` 404s there and the site falls back to `products.json`
plus the local images in `assets/` — it looks correct, it just isn't live.

For the live Instagram-as-CMS behaviour the site needs a host that runs functions
(Netlify, which is what the plan doc is written against). Everything else is identical.

## Files
| path | what |
|---|---|
| `index.html` | the site, GitHub Pages entry point |
| `TY Designs Site.dc.html` | same site, source of truth — re-copy to `index.html` after edits |
| `Instagram CMS Plan.dc.html` | how the Instagram-as-CMS setup works, and Tawanna's instructions |
| `TY Wordmark Options.dc.html` | the six TY serif candidates (Marcellus is the pick) |
| `products.json` | fallback catalog, used when the Instagram function is unavailable |
| `netlify/functions/instagram.js` | reads her posts, parses captions, 30-min cache |
| `netlify/functions/refresh-token.js` | weekly refresh of the 60-day Instagram token |
| `netlify.toml` | maps `/api/instagram` to the function |
| `assets/` | logos and product photography from her Instagram |
| `support.js` | runtime the `.dc.html` files load |

## Contact
313 306 4412 · tydesigns1817@gmail.com · @tyd.esign

## Live
https://landon358.github.io/tydesigns/

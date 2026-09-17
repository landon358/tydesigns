# TY Designs — website

Custom gifts and balloon decor, Detroit MI. Static site, no build step, one owner panel.

## How she updates it

She opens `/admin`, signs in with one password, and adds an item: a photo, plus an optional
description. No prices anywhere, by her request.
The site picks it up straight away. She can edit, reorder, hide or delete the same way.

The eleven products the site launched with are seeded into storage on the first request
(`netlify/lib/seed.mjs`), so they show up in the panel as ordinary items she can edit or
remove. A `seeded` flag means deleting them all keeps them gone.

Photos are shrunk in her browser before upload, stored in Netlify Blobs, and served from
`/media/<key>` with a permanent cache. Nothing is ever deployed to change content.

## Run it locally

```bash
npm install
npx netlify dev --port 8899 --offline
```

Local runs read `.env` (not committed) for `ADMIN_PASSWORD` and `SESSION_SECRET`, and keep
items and photos in a local blob store under `.netlify/`, so nothing touches the live site.

## Deploy

Netlify, publish directory `.`. Two environment variables, set in Site settings:

| variable | what |
|---|---|
| `ADMIN_PASSWORD` | the one password she types at `/admin` |
| `SESSION_SECRET` | any long random string; signs the sign-in cookie |

Changing `SESSION_SECRET` signs everyone out. Changing `ADMIN_PASSWORD` alone does too,
if `SESSION_SECRET` was never set.

This cannot run on GitHub Pages: the panel needs the three functions below.

## Design system

One easing curve (`--ease`) and one depth recipe run the whole site. Cards sit in a blush
tray with the image nested inside it; buttons compress when pressed and their trailing
arrow drifts on hover; sections enter on scroll through an IntersectionObserver, using
transform and opacity only. Everything collapses at `prefers-reduced-motion`.

Two details specific to this framework, worth knowing before editing:

- The runtime rewrites `className` on any element with a `style-hover`, so reveal state is
  stored in a `data-in` attribute instead. A class would be wiped on the next render.
- `<img src="{{ ... }}">` inside `<sc-for>` makes the browser request the literal
  placeholder once per list before React hydrates. Three harmless 404s per page load.

## Order form

The form posts to Netlify Forms. `__forms.html` holds a hidden copy of every field so
Netlify's deploy-time parser can register the form, since the real one is rendered by
JavaScript and never appears in the built HTML. Submissions land in Site settings, Forms.
Keep the two field lists in step when the form changes.

## Files

| path | what |
|---|---|
| `index.html` | the site, entry point |
| `TY Designs Site.dc.html` | same site, source of truth — re-copy to `index.html` after edits |
| `admin/index.html` | the owner panel |
| `netlify/functions/catalog.mjs` | public list of items, no login needed |
| `netlify/functions/admin.mjs` | sign in, add, edit, reorder, delete, photo upload |
| `netlify/functions/media.mjs` | serves an uploaded photo |
| `netlify/lib/store.mjs` | storage, seeding and sign-in helpers |
| `netlify/lib/seed.mjs` | the starting catalog, written to storage once on first read |
| `__forms.html` | hidden field definitions so Netlify registers the order form |
| `assets/` | product photography, resized to 1100px and recompressed |
| `support.js` | runtime the `.dc.html` files load |

## Security notes

One shared password, a signed HttpOnly cookie, 30 day sessions, ten sign-in tries per
15 minutes. Good for a gift catalog. If the panel ever holds customer data, this needs
proper accounts instead.

## Contact

313 306 4412 · tydesigns1817@gmail.com · @tyd.esign

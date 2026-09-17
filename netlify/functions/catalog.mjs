// Public catalog. The site reads this; anything she has hidden never leaves the server.

import { readItems, json } from "../lib/store.mjs";

export default async function handler() {
  const items = (await readItems())
    .filter((it) => !it.hidden && it.img)
    .map(({ id, img, desc }) => ({ id, img, desc }));

  return json(
    { items },
    { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=600" } }
  );
}

export const config = { path: "/api/catalog" };

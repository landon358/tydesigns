// Serves an uploaded photo. Keys are random, so a photo URL never changes and can cache forever.

import { media } from "../lib/store.mjs";

export default async function handler(req, ctx) {
  const key = String(ctx.params.key || "").replace(/[^a-z0-9._-]/gi, "");
  if (!key) return new Response("Not found", { status: 404 });

  const blob = await media().getWithMetadata(key, { type: "arrayBuffer" });
  if (!blob) return new Response("Not found", { status: 404 });

  return new Response(blob.data, {
    headers: {
      "content-type": blob.metadata?.type || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
      // Keys are unique per upload, so let the CDN keep the photo and stop
      // re-running this function for every visitor.
      "netlify-cdn-cache-control": "public, max-age=31536000, immutable"
    }
  });
}

export const config = { path: "/media/:key" };

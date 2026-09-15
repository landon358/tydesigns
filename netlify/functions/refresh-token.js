// netlify/functions/refresh-token.js
// Instagram long-lived tokens last 60 days and must be refreshed while still valid.
// This runs weekly, so the site can never go dark from an expired token.

import { getStore } from "@netlify/blobs";

export default async function handler() {
  const store = getStore("ty-instagram");
  const current = (await store.get("token")) || process.env.IG_TOKEN;
  if (!current) return new Response("no token", { status: 500 });

  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${current}`
  );
  if (!res.ok) return new Response("refresh failed: " + res.status, { status: 502 });

  const { access_token, expires_in } = await res.json();
  await store.set("token", access_token);
  await store.set("token_refreshed_at", new Date().toISOString());
  return new Response(JSON.stringify({ ok: true, expires_in }), {
    headers: { "content-type": "application/json" }
  });
}

export const config = { schedule: "@weekly" };

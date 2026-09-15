// netlify/functions/instagram.js
// Serves Tawanna's Instagram posts to the site at request time.
// No build, no deploy, no expiring image URLs stored anywhere.
//
// Env vars (Netlify → Site settings → Environment variables):
//   IG_TOKEN   long-lived Instagram user access token (60 days, auto-refreshed below)
//   IG_APP_ID / IG_APP_SECRET  only needed for the initial token exchange, not here
//
// Endpoint: /api/instagram  (see netlify.toml redirect)
// Returns: { products: [...], feed: [...] }

import { getStore } from "@netlify/blobs";

const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
const CACHE_MS = 30 * 60 * 1000; // 30 min — she posts near-daily, not near-minutely
let memo = { at: 0, body: null };

// Categories the Shop page filters on. Match on a hashtag or a keyword in the caption.
const CATEGORIES = [
  { name: "Tumblers & Mugs", tags: ["tumbler", "tumblers", "mug", "mugs", "cup", "cups", "waterbottle"] },
  { name: "Matching Sets", tags: ["set", "sets", "matchingset", "backtoschool"] },
  { name: "Keepsake Gifts", tags: ["puzzle", "mirror", "mirrors", "button", "buttons", "bookmark", "moneybouquet"] },
  { name: "Apparel & Aprons", tags: ["apron", "aprons", "smock", "smocks", "tshirt", "shirt", "totebag"] },
  { name: "Balloon Decor", tags: ["balloon", "balloons", "garland", "column", "columns", "backdrop"] }
];

async function readToken() {
  // A scheduled function keeps the refreshed token here; env var is the seed/fallback.
  try {
    const store = getStore("ty-instagram");
    const saved = await store.get("token");
    if (saved) return saved;
  } catch (e) {}
  return process.env.IG_TOKEN;
}

function firstLine(caption) {
  if (!caption) return "";
  const line = caption.split("\n").find((l) => l.trim().length > 0) || "";
  // Drop leading emoji/punctuation noise, trim to a card-sized title.
  const clean = line.replace(/[#@].*$/, "").replace(/\s+/g, " ").trim();
  return clean.length > 58 ? clean.slice(0, 55).replace(/[ ,.;:-]+$/, "") + "…" : clean;
}

function priceFrom(caption) {
  if (!caption) return "Ask for pricing";
  const starting = /starting at\s*\$?(\d+)/i.exec(caption);
  if (starting) return "From $" + starting[1];
  const from = /from\s*\$(\d+)/i.exec(caption);
  if (from) return "From $" + from[1];
  const flat = /\$(\d+)/.exec(caption);
  if (flat) return "$" + flat[1];
  return "Ask for pricing";
}

function categoryFrom(caption) {
  const hay = (caption || "").toLowerCase().replace(/[^a-z0-9#\s]/g, " ");
  for (const c of CATEGORIES) {
    if (c.tags.some((t) => hay.includes("#" + t) || new RegExp("\\b" + t + "\\b").test(hay))) return c.name;
  }
  return "Keepsake Gifts";
}

function noteFrom(caption) {
  if (!caption) return "";
  const body = caption
    .split("\n")
    .slice(1)
    .join(" ")
    .replace(/#[\w.]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentence = (body.split(/(?<=[.!?])\s/)[0] || body).trim();
  return sentence.length > 110 ? sentence.slice(0, 107) + "…" : sentence;
}

// Reels give a video_url in media_url; use the still frame for cards.
const still = (m) => (m.media_type === "VIDEO" ? m.thumbnail_url || m.media_url : m.media_url);

export default async function handler() {
  const now = Date.now();
  if (memo.body && now - memo.at < CACHE_MS) {
    return new Response(memo.body, {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=1800" }
    });
  }

  const token = await readToken();
  if (!token) return new Response(JSON.stringify({ error: "no_token" }), { status: 500 });

  const url = `https://graph.instagram.com/me/media?fields=${FIELDS}&limit=50&access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) {
    // Serve stale rather than an empty shop.
    if (memo.body) return new Response(memo.body, { headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ error: "instagram_error", status: res.status }), { status: 502 });
  }
  const { data = [] } = await res.json();

  const usable = data.filter((m) => still(m));

  const feed = usable.slice(0, 12).map((m) => ({
    img: still(m),
    permalink: m.permalink,
    alt: firstLine(m.caption) || "Recent work by TY Designs"
  }));

  // Opt-in: only posts tagged #tyshop become shop cards.
  const products = usable
    .filter((m) => /#tyshop\b/i.test(m.caption || ""))
    .map((m, i) => ({
      name: firstLine(m.caption) || "Custom piece",
      category: categoryFrom(m.caption),
      price: priceFrom(m.caption),
      note: noteFrom(m.caption),
      img: still(m),
      permalink: m.permalink,
      order: i * 10
    }));

  const body = JSON.stringify({ products, feed, fetchedAt: new Date().toISOString() });
  memo = { at: now, body };
  return new Response(body, {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=1800" }
  });
}

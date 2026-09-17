// Shared storage + login helpers for the owner panel.
// Items live as one JSON array in Netlify Blobs; photos live as blobs of their own.

import { getStore } from "@netlify/blobs";
import { createHmac, timingSafeEqual, createHash, randomUUID } from "node:crypto";
import { SEED } from "./seed.mjs";

export const ITEMS_KEY = "items";
const SEEDED_KEY = "seeded";
export const COOKIE = "ty_admin";
const SESSION_DAYS = 30;

export const content = () => getStore("ty-content");
export const media = () => getStore({ name: "ty-media", consistency: "strong" });

export async function readItems() {
  const rows = await content().get(ITEMS_KEY, { type: "json" });
  if (Array.isArray(rows)) return rows;

  // First ever read: turn the starting catalog into real items she can edit.
  // The flag matters more than the list being empty, otherwise deleting everything
  // would bring all eleven back the next time the page loaded.
  const done = await content().get(SEEDED_KEY);
  if (done) return [];
  const seeded = SEED.map((row) => ({ ...row, id: newId(), hidden: false, addedAt: null }));
  await writeItems(seeded);
  await content().set(SEEDED_KEY, "1");
  return seeded;
}

export async function writeItems(rows) {
  await content().setJSON(ITEMS_KEY, rows);
}

export const newId = () => randomUUID().replace(/-/g, "").slice(0, 16);

// ---- login ----------------------------------------------------------------

const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";

const sign = (payload) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function passwordOk(given) {
  const want = process.env.ADMIN_PASSWORD || "";
  if (!want || typeof given !== "string" || !given) return false;
  // Hash both sides first so the comparison is constant time whatever the lengths.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(want).digest();
  return timingSafeEqual(a, b);
}

export function makeCookie() {
  const payload = String(Date.now() + SESSION_DAYS * 864e5);
  const value = `${payload}.${sign(payload)}`;
  const secure = process.env.NETLIFY_DEV ? "" : " Secure;";
  return `${COOKIE}=${value}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export function signedIn(req) {
  if (!secret()) return false;
  const raw = (req.headers.get("cookie") || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return false;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig || sign(payload) !== sig) return false;
  return Number(payload) > Date.now();
}

export const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers || {}) }
  });

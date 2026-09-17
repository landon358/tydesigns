// Everything the owner panel does: sign in, list, add, edit, reorder, delete.
// One password, kept in the ADMIN_PASSWORD environment variable, never in this repo.

import {
  readItems, writeItems, media, newId,
  passwordOk, makeCookie, clearCookie, signedIn, json
} from "../lib/store.mjs";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Slow down guessing. Serverless memory is short-lived, which is fine: it only has to
// make a burst of attempts from one machine unpleasant.
const tries = new Map();
function throttled(ip) {
  const now = Date.now();
  const t = tries.get(ip) || { n: 0, at: now };
  if (now - t.at > 15 * 60e3) { t.n = 0; t.at = now; }
  t.n += 1;
  tries.set(ip, t);
  return t.n > 10;
}

const text = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export default async function handler(req, ctx) {
  const action = ctx.params.action;
  if (req.method !== "POST") return json({ error: "method" }, { status: 405 });

  if (action === "login") {
    const ip = ctx.ip || "unknown";
    if (throttled(ip)) return json({ error: "too_many" }, { status: 429 });
    const { password } = await req.json().catch(() => ({}));
    if (!passwordOk(password)) return json({ error: "bad_password" }, { status: 401 });
    tries.delete(ip);
    return json({ ok: true }, { headers: { "set-cookie": makeCookie() } });
  }

  if (action === "logout") {
    return json({ ok: true }, { headers: { "set-cookie": clearCookie() } });
  }

  if (!signedIn(req)) return json({ error: "signed_out" }, { status: 401 });

  const items = await readItems();

  if (action === "list") return json({ items });

  if (action === "upload") {
    const type = (req.headers.get("content-type") || "").split(";")[0];
    if (!TYPES[type]) return json({ error: "bad_type" }, { status: 415 });
    const bytes = await req.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) {
      return json({ error: "bad_size" }, { status: 413 });
    }
    const key = `${newId()}.${TYPES[type]}`;
    await media().set(key, bytes, { metadata: { type } });
    return json({ img: `/media/${key}` });
  }

  const body = await req.json().catch(() => ({}));

  if (action === "save") {
    const row = {
      id: text(body.id, 32) || newId(),
      img: text(body.img, 300),
      desc: text(body.desc, 300),
      hidden: !!body.hidden
    };
    if (!row.img) return json({ error: "no_photo" }, { status: 400 });
    const at = items.findIndex((it) => it.id === row.id);
    if (at === -1) items.unshift({ ...row, addedAt: new Date().toISOString() });
    else items[at] = { ...items[at], ...row };
    await writeItems(items);
    return json({ items });
  }

  if (action === "delete") {
    const id = text(body.id, 32);
    const row = items.find((it) => it.id === id);
    if (!row) return json({ error: "not_found" }, { status: 404 });
    const rest = items.filter((it) => it.id !== id);
    await writeItems(rest);
    // Only drop the photo if nothing else is still pointing at it.
    const key = (row.img || "").split("/media/")[1];
    if (key && !rest.some((it) => it.img === row.img)) {
      await media().delete(key).catch(() => {});
    }
    return json({ items: rest });
  }

  if (action === "move") {
    const id = text(body.id, 32);
    const at = items.findIndex((it) => it.id === id);
    const to = at + (body.dir === "up" ? -1 : 1);
    if (at === -1 || to < 0 || to >= items.length) return json({ items });
    [items[at], items[to]] = [items[to], items[at]];
    await writeItems(items);
    return json({ items });
  }

  return json({ error: "unknown_action" }, { status: 404 });
}

export const config = { path: "/api/admin/:action" };

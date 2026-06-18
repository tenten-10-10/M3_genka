// 商品企画書アプリ API（Supabase Edge Function / Deno）
//
// 認証（独自ユーザー名＋パスワード）とプロジェクト保存を提供する。
// service_role キーは Edge ランタイムに自動注入され、RLS をバイパスして
// DB へアクセスする（所有者制御は本コードで実施）。クライアントには
// 自前の HMAC トークン（x-genka-token ヘッダ）を発行する。
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
const enc = new TextEncoder();
const dec = new TextDecoder();

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-genka-token, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ---- base64 ----
function b64enc(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64dec(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function b64url(bytes: Uint8Array): string {
  return b64enc(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDec(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return b64dec(s);
}

// ---- パスワード（PBKDF2-SHA256）----
async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return new Uint8Array(bits);
}
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${b64enc(salt)}$${b64enc(hash)}`;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = (stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const got = await pbkdf2(password, b64dec(parts[2]), parseInt(parts[1], 10));
  const want = b64dec(parts[3]);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

// ---- トークン（HMAC-SHA256、署名鍵は service_role）----
let hmac: CryptoKey | null = null;
async function hmacKey(): Promise<CryptoKey> {
  if (!hmac) {
    hmac = await crypto.subtle.importKey("raw", enc.encode(SERVICE_ROLE), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  }
  return hmac;
}
async function makeToken(uid: string): Promise<string> {
  const header = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(enc.encode(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14 })));
  const data = `${header}.${payload}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}
async function verifyToken(token: string): Promise<string | null> {
  try {
    const [h, p, s] = (token || "").split(".");
    if (!h || !p || !s) return null;
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(), b64urlDec(s), enc.encode(`${h}.${p}`));
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(b64urlDec(p)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return String(payload.uid);
  } catch {
    return null;
  }
}

const pubUser = (u: any) => ({ id: u.id, username: u.username, createdAt: u.created_at });
const pubProjMeta = (p: any) => ({ id: p.id, name: p.name, createdAt: p.created_at, updatedAt: p.updated_at });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  let path = url.pathname;
  const idx = path.indexOf("/genka-api");
  if (idx >= 0) path = path.slice(idx + "/genka-api".length);
  if (path === "") path = "/";
  const method = req.method;

  let body: any = {};
  if (method === "POST" || method === "PUT") body = await req.json().catch(() => ({}));
  const uid = async () => await verifyToken(req.headers.get("x-genka-token") || "");

  try {
    // ---- 認証 ----
    if (method === "POST" && path === "/register") {
      const username = String(body.username ?? "").trim();
      const password = String(body.password ?? "");
      if (!username || password.length < 6) return json({ error: "ユーザー名と6文字以上のパスワードを入力してください" }, 400);
      const { data: existing } = await db.from("genka_users").select("id").ilike("username", username).maybeSingle();
      if (existing) return json({ error: "このユーザー名は既に使用されています" }, 409);
      const password_hash = await hashPassword(password);
      const { data: user, error } = await db.from("genka_users").insert({ username, password_hash }).select("id, username, created_at").single();
      if (error) return json({ error: error.message }, 400);
      return json({ token: await makeToken(user.id), user: pubUser(user) });
    }

    if (method === "POST" && path === "/login") {
      const username = String(body.username ?? "").trim();
      const password = String(body.password ?? "");
      const { data: user } = await db.from("genka_users").select("*").ilike("username", username).maybeSingle();
      if (!user || !(await verifyPassword(password, user.password_hash))) {
        return json({ error: "ユーザー名またはパスワードが違います" }, 401);
      }
      return json({ token: await makeToken(user.id), user: pubUser(user) });
    }

    if (method === "GET" && path === "/me") {
      const id = await uid();
      if (!id) return json({ user: null });
      const { data: user } = await db.from("genka_users").select("id, username, created_at").eq("id", id).maybeSingle();
      return json({ user: user ? pubUser(user) : null });
    }

    if (method === "POST" && path === "/change-password") {
      const id = await uid();
      if (!id) return json({ error: "認証が必要です" }, 401);
      const newPassword = String(body.newPassword ?? "");
      if (newPassword.length < 6) return json({ error: "新しいパスワードは6文字以上で入力してください" }, 400);
      const { data: user } = await db.from("genka_users").select("*").eq("id", id).maybeSingle();
      if (!user || !(await verifyPassword(String(body.currentPassword ?? ""), user.password_hash))) {
        return json({ error: "現在のパスワードが違います" }, 401);
      }
      await db.from("genka_users").update({ password_hash: await hashPassword(newPassword) }).eq("id", id);
      return json({ ok: true });
    }

    // ---- プロジェクト ----
    if (path === "/projects" && method === "GET") {
      const id = await uid();
      if (!id) return json({ error: "認証が必要です" }, 401);
      const { data } = await db.from("genka_projects").select("id, name, created_at, updated_at").eq("owner_id", id).order("updated_at", { ascending: false });
      return json({ projects: (data ?? []).map(pubProjMeta) });
    }

    if (path === "/projects" && method === "POST") {
      const id = await uid();
      if (!id) return json({ error: "認証が必要です" }, 401);
      const name = (String(body.name ?? "").trim()) || "無題の企画書";
      const { data: project, error } = await db.from("genka_projects").insert({ owner_id: id, name, data: body.data ?? {} }).select("*").single();
      if (error) return json({ error: error.message }, 400);
      return json({ project });
    }

    const pm = path.match(/^\/projects\/([^/]+)$/);
    if (pm) {
      const id = await uid();
      if (!id) return json({ error: "認証が必要です" }, 401);
      const pid = pm[1];
      if (method === "GET") {
        const { data: project } = await db.from("genka_projects").select("*").eq("id", pid).eq("owner_id", id).maybeSingle();
        if (!project) return json({ error: "見つかりません" }, 404);
        return json({ project });
      }
      if (method === "PUT") {
        const patch: any = { updated_at: new Date().toISOString() };
        if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
        if (body.data !== undefined) patch.data = body.data;
        const { data: project, error } = await db.from("genka_projects").update(patch).eq("id", pid).eq("owner_id", id).select("*").maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!project) return json({ error: "見つかりません" }, 404);
        return json({ project });
      }
      if (method === "DELETE") {
        const { error } = await db.from("genka_projects").delete().eq("id", pid).eq("owner_id", id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }
    }

    return json({ error: "not found", path, method }, 404);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

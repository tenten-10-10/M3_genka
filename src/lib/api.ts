import { supabase, STORAGE_BUCKET, SUPABASE_URL, INVITE_CODE } from "./supabase";
import type { Product, ProductRecord } from "./types";
import { uid } from "./format";

const TABLE = "m3_products";

// ===== 商品 CRUD =====

export async function listProducts(): Promise<ProductRecord[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProductRecord[];
}

export async function getProduct(id: string): Promise<ProductRecord> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error) throw error;
  return data as ProductRecord;
}

export async function createProduct(name: string, data: Product): Promise<ProductRecord> {
  const { data: user } = await supabase.auth.getUser();
  const row = {
    name,
    data,
    owner_id: user.user?.id ?? null,
    owner_email: user.user?.email ?? null,
  };
  const { data: created, error } = await supabase.from(TABLE).insert(row).select("*").single();
  if (error) throw error;
  return created as ProductRecord;
}

export async function updateProduct(id: string, name: string, data: Product): Promise<ProductRecord> {
  const { data: updated, error } = await supabase
    .from(TABLE)
    .update({ name, data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return updated as ProductRecord;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateProduct(rec: ProductRecord): Promise<ProductRecord> {
  const data = JSON.parse(JSON.stringify(rec.data)) as Product;
  data.name = rec.name + "（コピー）";
  return createProduct(data.name, data);
}

// ===== 画像アップロード =====

export async function uploadImage(file: File): Promise<{ url: string; path: string }> {
  const { data: user } = await supabase.auth.getUser();
  const owner = user.user?.id ?? "anon";
  const ext = file.name.split(".").pop() || "png";
  const path = `${owner}/${uid()}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/png",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function removeImage(path?: string): Promise<void> {
  if (!path) return;
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}

// ===== 共有（HTML をDBに保存し、公開ビューア /share/:id で閲覧） =====
export async function createShare(html: string, name: string): Promise<string> {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("m3_shares")
    .insert({ html, name, owner_id: user.user?.id ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function getShare(id: string): Promise<{ html: string; name: string }> {
  const { data, error } = await supabase.from("m3_shares").select("html,name").eq("id", id).single();
  if (error) throw error;
  return data as { html: string; name: string };
}

// ===== 認証 =====

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// 新規登録（Edge Function 経由で自動確認ユーザーを作成 → そのままログイン）
export async function register(email: string, password: string, name: string, inviteCode: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/m3-register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, inviteCode }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || "登録に失敗しました");
  }
  // 登録成功 → ログイン
  return signIn(email, password);
}

// 招待コード欄の初期値（クライアント側のヒント。実際の検証は Edge Function 側）
export const DEFAULT_INVITE_CODE = INVITE_CODE;

import { createClient } from "@supabase/supabase-js";

// anon / publishable キーは公開可能（RLS でデータを保護）。
// 環境変数が無い場合でも動くよう、既定値を埋め込んでいる。
const url =
  import.meta.env.VITE_SUPABASE_URL || "https://lwxpbgbqldhnvcxnyehe.supabase.co";
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_2VEBArGuqzBSviNUiF_AOQ_oK1QbO1d";

export const INVITE_CODE = import.meta.env.VITE_INVITE_CODE || "";

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const SUPABASE_URL = url;
export const STORAGE_BUCKET = "m3-genka-images";

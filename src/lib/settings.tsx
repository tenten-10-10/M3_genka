import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";

const TABLE = "m3_settings";

export async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabase.from(TABLE).select("value").eq("key", key).maybeSingle();
  return (data?.value as string | undefined) ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

// ===== アプリ共通設定（ロゴURLなど） =====
interface SettingsState {
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  reload: () => void;
}

const SettingsContext = createContext<SettingsState>({
  logoUrl: null,
  setLogoUrl: () => {},
  reload: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  function reload() {
    getSetting("logo_url").then(setLogoUrl).catch(() => {});
  }

  useEffect(() => {
    reload();
    const { data: sub } = supabase.auth.onAuthStateChange(() => reload());
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <SettingsContext.Provider value={{ logoUrl, setLogoUrl, reload }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

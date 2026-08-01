import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Rol ayrımı anahtarı.
 *
 * `false` iken admin ve personel AYNI yetkilere sahiptir — tüm sayfalar ve
 * butonlar herkese açılır. Ayrımı geri getirmek için:
 *   1. bu değeri `true` yapın,
 *   2. veritabanında 0002 ve 0005 numaralı migration'lardaki RLS
 *      politikalarını tekrar uygulayın (0007 onları gevşetiyor).
 * Tek başına bu bayrağı değiştirmek yetmez — asıl kontrol RLS'tedir.
 */
export const ROL_AYRIMI_AKTIF = false;

export type SessionUser = {
  id: string;
  email: string;
  profile: Profile;
  /** Yönetici yetkileri. ROL_AYRIMI_AKTIF=false iken herkes için true. */
  isAdmin: boolean;
};

/** Oturum + profil. Oturum yoksa /login'e yönlendirir. */
export async function getSessionUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const resolved: Profile = profile ?? {
    id: user.id,
    rol: "personel",
    ad_soyad: user.email ?? "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    id: user.id,
    email: user.email ?? "",
    profile: resolved,
    isAdmin: !ROL_AYRIMI_AKTIF || resolved.rol === "admin",
  };
}

/**
 * Yönetici sayfalarının kapısı.
 * ROL_AYRIMI_AKTIF=false iken kimseyi geri çevirmez.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user.isAdmin) redirect("/dashboard?hata=yetkisiz");
  return user;
}

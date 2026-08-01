import type { Metadata } from "next";

import { Alert, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

import { UserManager, type KullaniciSatiri } from "./user-manager";

export const metadata: Metadata = { title: "Kullanıcılar" };

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: profilData } = await supabase
    .from("profiles")
    .select("*")
    .order("ad_soyad");
  const profiller = (profilData ?? []) as Profile[];

  // E-posta ve son giriş bilgisi auth.users'ta; Admin API ile okunur.
  let serviceKeyVar = true;
  let authMap = new Map<
    string,
    { email: string; son_giris: string | null; olusturma: string | null }
  >();
  let uyari: string | null = null;

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw error;
    authMap = new Map(
      data.users.map((u) => [
        u.id,
        {
          email: u.email ?? "",
          son_giris: u.last_sign_in_at ?? null,
          olusturma: u.created_at ?? null,
        },
      ]),
    );
  } catch (e) {
    serviceKeyVar = false;
    uyari = (e as Error).message;
  }

  const kullanicilar: KullaniciSatiri[] = profiller.map((p) => {
    const auth = authMap.get(p.id);
    return {
      id: p.id,
      email: auth?.email ?? "—",
      ad_soyad: p.ad_soyad,
      rol: p.rol,
      son_giris: auth?.son_giris ?? null,
      olusturma: auth?.olusturma ?? p.created_at,
    };
  });

  return (
    <>
      <PageHeader
        title="Kullanıcı Yönetimi"
        description="Sisteme giriş yapabilecek kişiler ve rolleri."
      />

      {!serviceKeyVar && uyari && (
        <div className="mb-4">
          <Alert ton="amber">E-posta bilgileri okunamadı: {uyari}</Alert>
        </div>
      )}

      <UserManager
        kullanicilar={kullanicilar}
        mevcutKullaniciId={admin.id}
        serviceKeyVar={serviceKeyVar}
      />
    </>
  );
}

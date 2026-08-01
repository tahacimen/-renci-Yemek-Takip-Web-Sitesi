import type { Metadata } from "next";

import { Card, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { tarihSaat } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { TaksitPlani } from "@/lib/types";

import { SettingsForm } from "./settings-form";
import { TaksitForm } from "./taksit-form";

export const metadata: Metadata = { title: "Ayarlar" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ yil?: string }>;
}) {
  const sp = await searchParams;
  const yil = Number(sp.yil) || new Date().getFullYear();

  await requireAdmin();
  const supabase = await createClient();

  const [{ data }, { data: taksitData }] = await Promise.all([
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("taksit_plani")
      .select("*")
      .eq("yil", yil)
      .order("vade_tarihi"),
  ]);

  const tabanUcret = Number(data?.taban_gunluk_ucret ?? 0);
  const taksitler = (taksitData ?? []) as TaksitPlani[];

  return (
    <>
      <PageHeader
        title="Sistem Ayarları"
        description="Bu değerler tüm öğrenciler ve yemekhane ekranı için geçerlidir."
      />

      <div className="space-y-6">
        <Card
          title="Yemek ücretleri"
          actions={
            data?.updated_at ? (
              <span className="text-xs text-slate-500">
                Son güncelleme: {tarihSaat(data.updated_at)}
              </span>
            ) : undefined
          }
        >
          <SettingsForm
            tabanUcret={tabanUcret}
            ucretliUcret={Number(data?.ucretli_ogun_ucreti ?? 0)}
            misafirUcret={Number(data?.misafir_ogun_ucreti ?? 0)}
          />
        </Card>

        <Card title={`Aylıkçı taksit planı — ${yil}`}>
          <TaksitForm taksitler={taksitler} yil={yil} />
        </Card>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { Alert, PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { PosTerminal } from "./pos-terminal";

export const metadata: Metadata = { title: "Yemekhane Girişi" };

export default async function PosPage() {
  await getSessionUser();
  const supabase = await createClient();

  const { data: ayar } = await supabase
    .from("app_settings")
    .select("taban_gunluk_ucret")
    .eq("id", 1)
    .maybeSingle();
  const tabanUcret = Number(ayar?.taban_gunluk_ucret ?? 0);

  return (
    <>
      <PageHeader
        title="Yemekhane Girişi"
        description="Öğrenci numarasını yazın veya kartı okutun, ardından abone tipine basın."
      />

      {tabanUcret <= 0 && (
        <div className="mx-auto mb-4 max-w-4xl">
          <Alert ton="amber">
            Taban günlük ücret tanımlı değil; günlükçü öğrenciler için yemek
            kaydı yapılamaz.{" "}
            <Link href="/admin/settings" className="font-medium underline">
              Ayarlar sayfasından girin
            </Link>
            .
          </Alert>
        </div>
      )}

      <PosTerminal />
    </>
  );
}

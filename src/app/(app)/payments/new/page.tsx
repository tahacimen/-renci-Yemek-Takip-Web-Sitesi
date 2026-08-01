import type { Metadata } from "next";
import Link from "next/link";

import type { SecilenOgrenci } from "@/components/student-autocomplete";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { PaymentForm } from "./payment-form";

export const metadata: Metadata = { title: "Yeni İşlem" };

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const { student } = await searchParams;
  await getSessionUser();
  const supabase = await createClient();

  const { data: ayar } = await supabase
    .from("app_settings")
    .select("taban_gunluk_ucret")
    .eq("id", 1)
    .maybeSingle();
  const tabanUcret = Number(ayar?.taban_gunluk_ucret ?? 0);

  let baslangicOgrenci: SecilenOgrenci | null = null;
  if (student) {
    const { data } = await supabase
      .from("student_balances")
      .select(
        "student_id, ad_soyad, ogrenci_no, sinif, kalan, efektif_gunluk_ucret",
      )
      .eq("student_id", student)
      .maybeSingle();
    baslangicOgrenci = (data as SecilenOgrenci | null) ?? null;
  }

  return (
    <>
      <PageHeader
        title="Ödeme Al / Harcama Gir"
        description="Tahsilat, veliden alınan parayı; harcama, öğrencinin yediği yemek bedelini ifade eder."
      />

      {tabanUcret <= 0 && (
        <div className="mb-4">
          <Alert ton="amber">
            Taban günlük ücret tanımlı değil. Harcama kaydı, öğrencinin günlük
            ücretinden hesaplandığı için bu değer girilmeden harcama
            işlenemez.{" "}
            <Link href="/admin/settings" className="font-medium underline">
              Ayarlar sayfasından girin
            </Link>
            .
          </Alert>
        </div>
      )}

      <div className="max-w-4xl">
        <Card>
          <PaymentForm
            baslangicOgrenci={baslangicOgrenci}
            tabanUcret={tabanUcret}
          />
        </Card>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Badge,
  Card,
  LinkButton,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { para, tarih } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Profile, StudentBalance, Transaction } from "@/lib/types";

import { DeleteStudentButton } from "./delete-student";
import { IskontoForm } from "./iskonto-form";
import { TransactionTable, type IslemSatiri } from "./transaction-table";

export const metadata: Metadata = { title: "Öğrenci Detayı" };

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  const supabase = await createClient();

  const [{ data: ogrenciData }, { data: islemData }, { data: ayar }] =
    await Promise.all([
      supabase
        .from("student_balances")
        .select("*")
        .eq("student_id", id)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select("*")
        .eq("student_id", id)
        .order("tarih", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("app_settings")
        .select("taban_gunluk_ucret")
        .eq("id", 1)
        .maybeSingle(),
    ]);

  const ogrenci = ogrenciData as StudentBalance | null;
  if (!ogrenci) notFound();

  const islemler = (islemData ?? []) as Transaction[];
  const tabanUcret = Number(ayar?.taban_gunluk_ucret ?? 0);

  // İşlemi yapan kullanıcı adlarını çöz (RLS nedeniyle personel yalnızca
  // kendi profilini görebilir; görülemeyenler "-" olarak kalır).
  const userIds = [
    ...new Set(
      islemler
        .map((t) => t.islemi_yapan_user_id)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  let adMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiller } = await supabase
      .from("profiles")
      .select("id, ad_soyad")
      .in("id", userIds);
    adMap = new Map(
      ((profiller ?? []) as Pick<Profile, "id" | "ad_soyad">[]).map((p) => [
        p.id,
        p.ad_soyad,
      ]),
    );
  }

  const satirlar: IslemSatiri[] = islemler.map((t) => ({
    ...t,
    yapan_ad: t.islemi_yapan_user_id
      ? (adMap.get(t.islemi_yapan_user_id) ?? null)
      : null,
  }));

  const borclu = Number(ogrenci.kalan) < 0;

  return (
    <>
      <PageHeader
        title={ogrenci.ad_soyad}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>No: {ogrenci.ogrenci_no}</span>
            {ogrenci.sinif && <span>· Sınıf: {ogrenci.sinif}</span>}
            <Badge ton={ogrenci.abone_tipi === "aylik" ? "amber" : "blue"}>
              {ogrenci.abone_tipi === "aylik" ? "Aylıkçı" : "Günlükçü"}
            </Badge>
            {ogrenci.aktif ? (
              <Badge ton="green">Aktif</Badge>
            ) : (
              <Badge ton="slate">Pasif</Badge>
            )}
            {borclu && <Badge ton="red">Borçlu</Badge>}
          </span>
        }
        actions={
          <>
            <LinkButton href={`/payments/new?student=${ogrenci.student_id}`}>
              İşlem gir
            </LinkButton>
            {user.isAdmin && (
              <LinkButton href={`/students/${ogrenci.student_id}/edit`}>
                Bilgileri düzenle
              </LinkButton>
            )}
          </>
        }
      />

      {/* Cari hesap özeti */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Devir" value={para(ogrenci.devir)} />
        <StatCard
          label="Alınan Para"
          value={para(ogrenci.alinan_para)}
          ton="green"
        />
        <StatCard label="Harcanan" value={para(ogrenci.harcanan)} ton="red" />
        <StatCard
          label="Kalan"
          value={para(ogrenci.kalan)}
          hint="Devir + Alınan − Harcanan"
          ton={borclu ? "red" : "blue"}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card title="Veli bilgisi">
          <dl className="divide-y divide-slate-100 text-sm">
            <Satir baslik="Veli adı" deger={ogrenci.veli_adi} />
            <Satir baslik="Veli telefon" deger={ogrenci.veli_telefon} />
            <Satir baslik="Kimlik no" deger={ogrenci.kimlik_no} />
          </dl>
        </Card>

        <Card title="Ücret bilgisi">
          <dl className="divide-y divide-slate-100 text-sm">
            <Satir baslik="Taban günlük ücret" deger={para(tabanUcret)} />
            <Satir baslik="İskonto oranı" deger={`%${ogrenci.iskonto_orani}`} />
            <Satir
              baslik="İskonto tutarı"
              deger={para(ogrenci.iskonto_tutar)}
            />
            <Satir
              baslik="Efektif günlük ücret"
              deger={
                <strong className="text-blue-800">
                  {para(ogrenci.efektif_gunluk_ucret)}
                </strong>
              }
            />
          </dl>
        </Card>

        <Card title="Hareket bilgisi">
          <dl className="divide-y divide-slate-100 text-sm">
            <Satir baslik="Toplam işlem" deger={String(ogrenci.islem_sayisi)} />
            <Satir
              baslik="Son işlem tarihi"
              deger={
                ogrenci.son_islem_tarihi ? tarih(ogrenci.son_islem_tarihi) : "-"
              }
            />
            <Satir baslik="Kayıt tarihi" deger={tarih(ogrenci.created_at)} />
          </dl>
        </Card>
      </div>

      {user.isAdmin && (
        <div className="mb-6">
          <Card title="İskonto ve devir düzenle (yönetici)">
            <IskontoForm
              studentId={ogrenci.student_id}
              iskontoOrani={Number(ogrenci.iskonto_orani)}
              iskontoTutar={Number(ogrenci.iskonto_tutar)}
              devir={Number(ogrenci.devir)}
              tabanUcret={tabanUcret}
            />
          </Card>
        </div>
      )}

      <Card title={`İşlem geçmişi (${satirlar.length})`}>
        <TransactionTable
          islemler={satirlar}
          studentId={ogrenci.student_id}
          isAdmin={user.isAdmin}
        />
      </Card>

      {user.isAdmin && (
        <div className="mt-6">
          <Card title="Tehlikeli bölge">
            <div className="p-4">
              <p className="mb-3 text-sm text-slate-600">
                Öğrenciyi silmek, ona ait tüm tahsilat ve harcama kayıtlarını da
                siler. Bunun yerine öğrenciyi <strong>pasif</strong> yapmayı
                düşünün.
              </p>
              <DeleteStudentButton
                studentId={ogrenci.student_id}
                adSoyad={ogrenci.ad_soyad}
              />
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function Satir({
  baslik,
  deger,
}: {
  baslik: string;
  deger: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2">
      <dt className="text-slate-500">{baslik}</dt>
      <dd className="text-right font-medium text-slate-800">{deger || "-"}</dd>
    </div>
  );
}

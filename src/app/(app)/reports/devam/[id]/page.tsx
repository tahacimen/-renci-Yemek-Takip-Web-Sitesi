import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Alert,
  Badge,
  Card,
  LinkButton,
  PageHeader,
  StatCard,
  cx,
} from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { para } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { DevamAySatir, StudentBalance } from "@/lib/types";

import { YilSecici } from "./yil-secici";

export const metadata: Metadata = { title: "Öğrenci Devam Detayı" };

const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const GUN_HARFLERI = ["P", "S", "Ç", "P", "C", "C", "P"]; // Pzt..Paz

export default async function DevamDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ yil?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const yil = Number(sp.yil) || new Date().getFullYear();

  await getSessionUser();
  const supabase = await createClient();

  const [{ data: ogrenciData }, { data: devamData, error }] = await Promise.all([
    supabase
      .from("student_balances")
      .select("*")
      .eq("student_id", id)
      .maybeSingle(),
    supabase.rpc("rapor_devam_yil", { p_student_id: id, p_yil: yil }),
  ]);

  const ogrenci = ogrenciData as StudentBalance | null;
  if (!ogrenci) notFound();

  const aylar = (devamData ?? []) as DevamAySatir[];

  const toplamGelen = aylar.reduce((a, m) => a + Number(m.gelen_gun), 0);
  const toplamIsGunu = aylar.reduce((a, m) => a + Number(m.hafta_ici_gun), 0);
  const toplamTutar = aylar.reduce((a, m) => a + Number(m.ay_tutari), 0);
  const enYogunAy = aylar.reduce<DevamAySatir | null>(
    (max, m) => (!max || Number(m.gelen_gun) > Number(max.gelen_gun) ? m : max),
    null,
  );

  return (
    <>
      <PageHeader
        title={ogrenci.ad_soyad}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>No: {ogrenci.ogrenci_no}</span>
            {ogrenci.sinif && <span>· {ogrenci.sinif}</span>}
            <Badge ton={ogrenci.abone_tipi === "aylik" ? "amber" : "blue"}>
              {ogrenci.abone_tipi === "aylik" ? "Aylıkçı" : "Günlükçü"}
            </Badge>
            <span>· {yil} yılı devam çizelgesi</span>
          </span>
        }
        actions={
          <>
            <YilSecici yil={yil} />
            <LinkButton href={`/students/${id}`}>Öğrenci detayı</LinkButton>
            <LinkButton href="/reports/devam">← Listeye dön</LinkButton>
          </>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert>Rapor alınamadı: {error.message}</Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Yıl Boyunca Geldi"
          value={`${toplamGelen} gün`}
          hint={`${toplamIsGunu} iş gününden`}
          ton="blue"
        />
        <StatCard
          label="Gelmedi"
          value={`${Math.max(toplamIsGunu - toplamGelen, 0)} gün`}
          hint="Hafta içi günler üzerinden"
        />
        <StatCard
          label="En Yoğun Ay"
          value={enYogunAy ? `${enYogunAy.gelen_gun} gün` : "0"}
          hint={enYogunAy ? AY_ADLARI[enYogunAy.ay - 1] : "—"}
        />
        <StatCard
          label="Yıllık Yemek Tutarı"
          value={para(toplamTutar)}
          hint={
            ogrenci.abone_tipi === "aylik"
              ? "Aylıkçı — ücret taksitten tahsil edilir"
              : "Krediden düşülen toplam"
          }
          ton="green"
        />
      </div>

      <Card title={`${yil} — ay ay devam durumu`}>
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {aylar.map((m) => {
            const gunSayisi = new Date(yil, m.ay, 0).getDate();
            const geldi = new Set(m.gelen_gunler ?? []);
            // Ayın 1'i haftanın hangi günü (0=Pzt)
            const ilkGun = (new Date(yil, m.ay - 1, 1).getDay() + 6) % 7;
            const hucreler: (number | null)[] = [
              ...Array.from({ length: ilkGun }, () => null),
              ...Array.from({ length: gunSayisi }, (_, i) => i + 1),
            ];

            return (
              <div
                key={m.ay}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {AY_ADLARI[m.ay - 1]}
                  </h3>
                  <span className="text-xs text-slate-500">
                    <strong className="text-emerald-700">{m.gelen_gun}</strong>{" "}
                    geldi ·{" "}
                    <strong className="text-slate-600">{m.gelmeyen_gun}</strong>{" "}
                    gelmedi
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-0.5">
                  {GUN_HARFLERI.map((h, i) => (
                    <div
                      key={i}
                      className={cx(
                        "pb-1 text-center text-[10px] font-semibold",
                        i >= 5 ? "text-slate-300" : "text-slate-400",
                      )}
                    >
                      {h}
                    </div>
                  ))}

                  {hucreler.map((g, i) => {
                    if (g === null) return <div key={`b-${i}`} />;
                    const haftaSonu = i % 7 >= 5;
                    const vardi = geldi.has(g);
                    return (
                      <div
                        key={g}
                        title={`${g} ${AY_ADLARI[m.ay - 1]} ${yil} — ${
                          vardi ? "geldi" : "gelmedi"
                        }`}
                        className={cx(
                          "flex aspect-square items-center justify-center rounded text-[11px] font-semibold",
                          vardi
                            ? "bg-emerald-500 text-white"
                            : haftaSonu
                              ? "bg-slate-50 text-slate-300"
                              : "bg-slate-100 text-slate-400",
                        )}
                      >
                        {g}
                      </div>
                    );
                  })}
                </div>

                {Number(m.ay_tutari) > 0 && (
                  <p className="mt-2 text-right text-xs text-slate-500">
                    {para(m.ay_tutari)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-emerald-500" /> Geldi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-slate-100" /> Gelmedi
          (hafta içi)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-slate-50 ring-1 ring-slate-200" />{" "}
          Hafta sonu — sayıma dahil değil
        </span>
        <Link href={`/students/${id}`} className="text-blue-700 hover:underline">
          İşlem geçmişini gör →
        </Link>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import {
  Alert,
  Card,
  EmptyRow,
  PageHeader,
  StatCard,
  Table,
  TableWrap,
  Td,
  Th,
  cx,
} from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DevamSatir } from "@/lib/types";

import { MonthFilter } from "./month-filter";

export const metadata: Metadata = { title: "Devam Çizelgesi" };

const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export default async function DevamPage({
  searchParams,
}: {
  searchParams: Promise<{ yil?: string; ay?: string; sinif?: string }>;
}) {
  const sp = await searchParams;
  const simdi = new Date();
  const yil = Number(sp.yil) || simdi.getFullYear();
  const ay = Number(sp.ay) || simdi.getMonth() + 1;
  const sinif = sp.sinif ?? "";

  await getSessionUser();
  const supabase = await createClient();

  const [{ data, error }, { data: sinifData }] = await Promise.all([
    supabase.rpc("rapor_devam", {
      p_yil: yil,
      p_ay: ay,
      p_sinif: sinif || null,
      p_student_id: null,
    }),
    supabase.rpc("sinif_listesi"),
  ]);

  const satirlar = (data ?? []) as DevamSatir[];
  const siniflar = ((sinifData ?? []) as { sinif: string }[]).map((s) => s.sinif);

  const ayinGunSayisi = new Date(yil, ay, 0).getDate();
  const gunler = Array.from({ length: ayinGunSayisi }, (_, i) => i + 1);
  const haftaSonu = new Set(
    gunler.filter((g) => {
      const d = new Date(yil, ay - 1, g).getDay();
      return d === 0 || d === 6;
    }),
  );

  const haftaIciGun = satirlar[0]?.hafta_ici_gun ?? 0;
  const toplamGelen = satirlar.reduce((a, r) => a + Number(r.gelen_gun), 0);
  const hicGelmeyen = satirlar.filter((r) => Number(r.gelen_gun) === 0).length;

  return (
    <>
      <PageHeader
        title="Devam Çizelgesi"
        description={`${AY_ADLARI[ay - 1]} ${yil} — hangi öğrenci hangi gün yemek yedi`}
      />

      <div className="no-print mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <MonthFilter yil={yil} ay={ay} sinif={sinif} siniflar={siniflar} />
      </div>

      {error && (
        <div className="mb-4">
          <Alert>Rapor alınamadı: {error.message}</Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Öğrenci" value={satirlar.length} />
        <StatCard
          label="Ayın İş Günü"
          value={haftaIciGun}
          hint="Hafta içi günler"
        />
        <StatCard
          label="Toplam Öğün"
          value={toplamGelen}
          hint="Tüm öğrencilerin toplamı"
          ton="blue"
        />
        <StatCard
          label="Hiç Gelmeyen"
          value={hicGelmeyen}
          hint="Bu ay hiç yemek yemeyen"
          ton={hicGelmeyen > 0 ? "red" : "slate"}
        />
      </div>

      <Card title="Gün gün devam durumu">
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th className="sticky left-0 bg-slate-50">Öğrenci</Th>
                <Th align="center">Tip</Th>
                {gunler.map((g) => (
                  <Th
                    key={g}
                    align="center"
                    className={cx(
                      "w-8 px-1",
                      haftaSonu.has(g) && "bg-slate-200 text-slate-400",
                    )}
                  >
                    {g}
                  </Th>
                ))}
                <Th align="right">Geldi</Th>
                <Th align="right">Gelmedi</Th>
                <Th align="center">Detay</Th>
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 && (
                <EmptyRow colSpan={gunler.length + 5} />
              )}
              {satirlar.map((r) => {
                const geldi = new Set(r.gelen_gunler ?? []);
                return (
                  <tr key={r.student_id} className="hover:bg-slate-50">
                    <Td className="sticky left-0 whitespace-nowrap bg-white">
                      <Link
                        href={`/students/${r.student_id}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {r.ad_soyad}
                      </Link>
                      <span className="ml-2 text-xs text-slate-400">
                        {r.ogrenci_no}
                      </span>
                    </Td>
                    <Td align="center">
                      <span
                        className={cx(
                          "rounded px-1.5 py-0.5 text-xs font-semibold",
                          r.abone_tipi === "aylik"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-blue-100 text-blue-800",
                        )}
                      >
                        {r.abone_tipi === "aylik" ? "Aylık" : "Günlük"}
                      </span>
                    </Td>
                    {gunler.map((g) => (
                      <td
                        key={g}
                        className={cx(
                          "border-b border-slate-100 px-1 py-2 text-center text-xs font-bold",
                          geldi.has(g)
                            ? "bg-emerald-500 text-white"
                            : haftaSonu.has(g)
                              ? "bg-slate-100 text-slate-300"
                              : "text-slate-300",
                        )}
                        title={`${g} ${AY_ADLARI[ay - 1]}: ${
                          geldi.has(g) ? "geldi" : "gelmedi"
                        }`}
                      >
                        {geldi.has(g) ? "✓" : "·"}
                      </td>
                    ))}
                    <Td align="right" className="font-bold text-emerald-700">
                      {r.gelen_gun}
                    </Td>
                    <Td align="right" className="font-bold text-slate-500">
                      {r.gelmeyen_gun}
                    </Td>
                    <Td align="center">
                      <Link
                        href={`/reports/devam/${r.student_id}?yil=${yil}`}
                        className="whitespace-nowrap rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Yıllık detay
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <p className="mt-4 text-xs text-slate-500">
        Yeşil <strong>✓</strong> o gün yemek yediğini gösterir. Gri sütunlar
        hafta sonudur ve &quot;gelmedi&quot; sayısına dahil edilmez —
        gelmeyen gün sayısı <strong>hafta içi</strong> günler üzerinden
        hesaplanır. Resmî tatiller hesaba katılmaz.
      </p>
    </>
  );
}

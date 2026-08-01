import type { Metadata } from "next";
import Link from "next/link";

import type { SecilenOgrenci } from "@/components/student-autocomplete";
import {
  Alert,
  AnchorButton,
  Card,
  EmptyRow,
  PageHeader,
  StatCard,
  Table,
  TableWrap,
  Td,
  Th,
} from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { ayinIlkGunu, ayinSonGunu, para, tarih } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { RaporSatir } from "@/lib/types";

import { ReportFilters } from "./report-filters";

export const metadata: Metadata = { title: "Raporlar" };

type Params = Promise<{
  baslangic?: string;
  bitis?: string;
  sinif?: string;
  student?: string;
  aktif?: string;
}>;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const sp = await searchParams;
  const baslangic = sp.baslangic || ayinIlkGunu();
  const bitis = sp.bitis || ayinSonGunu();
  const sinif = sp.sinif || "";
  const studentId = sp.student || "";
  const aktif = sp.aktif || "";

  await getSessionUser();
  const supabase = await createClient();

  const [{ data, error }, { data: sinifData }] = await Promise.all([
    supabase.rpc("rapor_detay", {
      p_baslangic: baslangic,
      p_bitis: bitis,
      p_sinif: sinif || null,
      p_student_id: studentId || null,
      p_sadece_aktif: aktif !== "hepsi",
    }),
    supabase.rpc("sinif_listesi"),
  ]);

  const satirlar = (data ?? []) as RaporSatir[];
  const siniflar = ((sinifData ?? []) as { sinif: string }[]).map(
    (s) => s.sinif,
  );

  let secilenOgrenci: SecilenOgrenci | null = null;
  if (studentId) {
    const { data: o } = await supabase
      .from("student_balances")
      .select(
        "student_id, ad_soyad, ogrenci_no, sinif, kalan, efektif_gunluk_ucret",
      )
      .eq("student_id", studentId)
      .maybeSingle();
    secilenOgrenci = (o as SecilenOgrenci | null) ?? null;
  }

  const topla = (f: (r: RaporSatir) => number) =>
    satirlar.reduce((acc, r) => acc + Number(f(r) ?? 0), 0);

  const toplamTahsilat = topla((r) => r.donem_tahsilat);
  const toplamDonemHarcama = topla((r) => r.donem_harcama);
  const toplamGelen = topla((r) => r.toplam_gelen);
  const toplamGiden = topla((r) => r.toplam_giden);
  const toplamKalan = topla((r) => r.kalan);

  const exportParams = new URLSearchParams({ baslangic, bitis });
  if (sinif) exportParams.set("sinif", sinif);
  if (studentId) exportParams.set("student", studentId);
  if (aktif) exportParams.set("aktif", aktif);

  return (
    <>
      <PageHeader
        title="Gelen–Giden–Tahsil Edilen Raporu"
        description={`${tarih(baslangic)} – ${tarih(bitis)}`}
        actions={
          <AnchorButton
            href={`/reports/export?${exportParams.toString()}`}
            download
          >
            CSV / Excel indir
          </AnchorButton>
        }
      />

      <div className="no-print mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <ReportFilters
          degerler={{ baslangic, bitis, sinif, aktif }}
          siniflar={siniflar}
          secilenOgrenci={secilenOgrenci}
        />
      </div>

      {error && (
        <div className="mb-4">
          <Alert>Rapor alınamadı: {error.message}</Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Toplam Tahsilat"
          value={para(toplamTahsilat)}
          hint="Seçilen dönemde"
          ton="blue"
        />
        <StatCard
          label="Toplam Gelen"
          value={para(toplamGelen)}
          hint="Devir + kümülatif tahsilat"
          ton="green"
        />
        <StatCard
          label="Toplam Giden"
          value={para(toplamGiden)}
          hint="Kümülatif harcama"
          ton="red"
        />
        <StatCard
          label="Toplam Kalan"
          value={para(toplamKalan)}
          hint="Gelen − Giden"
          ton={toplamKalan < 0 ? "red" : "slate"}
        />
      </div>

      <Card title={`Öğrenci bazlı kırılım (${satirlar.length} öğrenci)`}>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Öğrenci No</Th>
                <Th>Ad Soyad</Th>
                <Th>Sınıf</Th>
                <Th align="right">Devir</Th>
                <Th align="right">Dönem Tahsilat</Th>
                <Th align="right">Dönem Harcama</Th>
                <Th align="right">Toplam Gelen</Th>
                <Th align="right">Toplam Giden</Th>
                <Th align="right">Kalan</Th>
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 && (
                <EmptyRow colSpan={9}>
                  Seçilen filtrelere uyan kayıt yok.
                </EmptyRow>
              )}
              {satirlar.map((r) => (
                <tr key={r.student_id} className="hover:bg-slate-50">
                  <Td className="tabular text-slate-600">{r.ogrenci_no}</Td>
                  <Td>
                    <Link
                      href={`/students/${r.student_id}`}
                      className="text-blue-700 hover:underline"
                    >
                      {r.ad_soyad}
                    </Link>
                  </Td>
                  <Td>{r.sinif || "-"}</Td>
                  <Td align="right">{para(r.devir)}</Td>
                  <Td align="right">{para(r.donem_tahsilat)}</Td>
                  <Td align="right">{para(r.donem_harcama)}</Td>
                  <Td align="right">{para(r.toplam_gelen)}</Td>
                  <Td align="right">{para(r.toplam_giden)}</Td>
                  <Td
                    align="right"
                    className={
                      Number(r.kalan) < 0
                        ? "font-semibold text-rose-700"
                        : "font-semibold text-emerald-700"
                    }
                  >
                    {para(r.kalan)}
                  </Td>
                </tr>
              ))}
            </tbody>
            {satirlar.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-semibold">
                  <Td className="text-slate-700" align="left">
                    TOPLAM
                  </Td>
                  <Td />
                  <Td />
                  <Td align="right">{para(topla((r) => r.devir))}</Td>
                  <Td align="right">{para(toplamTahsilat)}</Td>
                  <Td align="right">{para(toplamDonemHarcama)}</Td>
                  <Td align="right">{para(toplamGelen)}</Td>
                  <Td align="right">{para(toplamGiden)}</Td>
                  <Td align="right">{para(toplamKalan)}</Td>
                </tr>
              </tfoot>
            )}
          </Table>
        </TableWrap>
      </Card>

      <p className="mt-4 text-xs text-slate-500">
        <strong>Sütun tanımları:</strong> Dönem Tahsilat/Harcama seçilen tarih
        aralığındaki hareketleri; Toplam Gelen (devir + dönem bitişine kadarki
        tüm tahsilat), Toplam Giden (dönem bitişine kadarki tüm harcama) ve
        Kalan (Gelen − Giden) kümülatif cari durumu gösterir.
      </p>
    </>
  );
}

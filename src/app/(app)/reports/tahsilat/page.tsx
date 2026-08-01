import type { Metadata } from "next";
import Link from "next/link";

import type { SecilenOgrenci } from "@/components/student-autocomplete";
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
} from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { isoTarih, para, tarih } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { TahsilatSatir } from "@/lib/types";

import { ReportFilters } from "../report-filters";

export const metadata: Metadata = { title: "Tahsilat Geçmişi" };

export default async function TahsilatPage({
  searchParams,
}: {
  searchParams: Promise<{
    baslangic?: string;
    bitis?: string;
    sinif?: string;
    student?: string;
  }>;
}) {
  const sp = await searchParams;
  const yil = new Date().getFullYear();
  const baslangic = sp.baslangic || isoTarih(new Date(yil, 0, 1));
  const bitis = sp.bitis || isoTarih(new Date(yil, 11, 31));
  const sinif = sp.sinif ?? "";
  const studentId = sp.student ?? "";

  await getSessionUser();
  const supabase = await createClient();

  const [{ data, error }, { data: sinifData }] = await Promise.all([
    supabase.rpc("rapor_tahsilatlar", {
      p_baslangic: baslangic,
      p_bitis: bitis,
      p_student_id: studentId || null,
      p_sinif: sinif || null,
    }),
    supabase.rpc("sinif_listesi"),
  ]);

  const satirlar = (data ?? []) as TahsilatSatir[];
  const siniflar = ((sinifData ?? []) as { sinif: string }[]).map((s) => s.sinif);

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

  const toplam = satirlar.reduce((a, r) => a + Number(r.tutar), 0);
  const ogrenciSayisi = new Set(satirlar.map((r) => r.student_id)).size;

  // Öğrenci bazlı gruplama (tek öğrenci seçilmemişse de okunaklı olsun)
  const gruplar = satirlar.reduce<Record<string, TahsilatSatir[]>>((acc, r) => {
    (acc[r.student_id] ??= []).push(r);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Tahsilat Geçmişi"
        description="Öğrencinin hesabına ne zaman, ne kadar para girişi yapıldı"
      />

      <div className="no-print mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <ReportFilters
          degerler={{ baslangic, bitis, sinif, aktif: "" }}
          siniflar={siniflar}
          secilenOgrenci={secilenOgrenci}
        />
      </div>

      {error && (
        <div className="mb-4">
          <Alert>Rapor alınamadı: {error.message}</Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Toplam Tahsilat"
          value={para(toplam)}
          hint={`${tarih(baslangic)} – ${tarih(bitis)}`}
          ton="green"
        />
        <StatCard label="Ödeme Sayısı" value={satirlar.length} />
        <StatCard label="Ödeme Yapan Öğrenci" value={ogrenciSayisi} />
      </div>

      <Card title={`Para girişleri (${satirlar.length} kayıt)`}>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Öğrenci</Th>
                <Th>Sınıf</Th>
                <Th>Tarih</Th>
                <Th align="right">Tutar</Th>
                <Th>Açıklama</Th>
                <Th>Kaydeden</Th>
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 && (
                <EmptyRow colSpan={6}>
                  Bu aralıkta tahsilat kaydı yok.
                </EmptyRow>
              )}
              {Object.entries(gruplar).map(([sid, kayitlar]) => {
                const ogrenciToplami = kayitlar.reduce(
                  (a, r) => a + Number(r.tutar),
                  0,
                );
                return kayitlar.map((r, i) => (
                  <tr key={r.transaction_id} className="hover:bg-slate-50">
                    {i === 0 ? (
                      <Td
                        className="align-top font-medium"
                        rowSpan={kayitlar.length}
                      >
                        <Link
                          href={`/students/${sid}`}
                          className="text-blue-700 hover:underline"
                        >
                          {r.ad_soyad}
                        </Link>
                        <div className="text-xs font-normal text-slate-500">
                          {r.ogrenci_no} · {kayitlar.length} ödeme ·{" "}
                          <strong>{para(ogrenciToplami)}</strong>
                        </div>
                      </Td>
                    ) : null}
                    <Td>{r.sinif || "-"}</Td>
                    <Td className="font-medium">{tarih(r.tarih)}</Td>
                    <Td align="right" className="font-semibold text-emerald-700">
                      {para(r.tutar)}
                    </Td>
                    <Td className="text-slate-600">{r.aciklama || "-"}</Td>
                    <Td className="text-xs text-slate-500">
                      {r.kaydeden || "-"}
                    </Td>
                  </tr>
                ));
              })}
            </tbody>
            {satirlar.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-semibold">
                  <Td>TOPLAM</Td>
                  <Td />
                  <Td />
                  <Td align="right">{para(toplam)}</Td>
                  <Td />
                  <Td />
                </tr>
              </tfoot>
            )}
          </Table>
        </TableWrap>
      </Card>
    </>
  );
}

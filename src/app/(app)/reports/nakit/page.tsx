import type { Metadata } from "next";

import { DateRangeFilter } from "@/components/date-range-filter";
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
import { ayinIlkGunu, ayinSonGunu, para, tarih } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { NakitSatir } from "@/lib/types";

export const metadata: Metadata = { title: "Nakit Raporu" };

export default async function NakitPage({
  searchParams,
}: {
  searchParams: Promise<{ baslangic?: string; bitis?: string }>;
}) {
  const sp = await searchParams;
  const baslangic = sp.baslangic || ayinIlkGunu();
  const bitis = sp.bitis || ayinSonGunu();

  await getSessionUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("rapor_nakit", {
    p_baslangic: baslangic,
    p_bitis: bitis,
  });

  const satirlar = (data ?? []) as NakitSatir[];

  const toplamNakit = satirlar.reduce(
    (a, r) => a + Number(r.ucretli_nakit),
    0,
  );
  const toplamTahsilat = satirlar.reduce(
    (a, r) => a + Number(r.tahsilat_tutar),
    0,
  );
  const toplamUcretliAdet = satirlar.reduce(
    (a, r) => a + Number(r.ucretli_adet),
    0,
  );
  const toplamMisafir = satirlar.reduce((a, r) => a + Number(r.misafir_adet), 0);

  return (
    <>
      <PageHeader
        title="Nakit Raporu"
        description="Gün gün yemekhanede toplanan nakit ve hesaba işlenen tahsilatlar"
      />

      <div className="no-print mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <DateRangeFilter baslangic={baslangic} bitis={bitis} />
      </div>

      {error && (
        <div className="mb-4">
          <Alert>Rapor alınamadı: {error.message}</Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Yemekhane Nakiti"
          value={para(toplamNakit)}
          hint={`${toplamUcretliAdet} ücretli öğün`}
          ton="green"
        />
        <StatCard
          label="Hesaba Tahsilat"
          value={para(toplamTahsilat)}
          hint="Öğrenci hesabına işlenen"
          ton="blue"
        />
        <StatCard
          label="Genel Toplam"
          value={para(toplamNakit + toplamTahsilat)}
          hint="Nakit + tahsilat"
        />
        <StatCard
          label="Misafir Öğün"
          value={toplamMisafir}
          hint="Personel / ziyaretçi"
        />
      </div>

      <Card title={`Gün bazlı nakit dökümü (${satirlar.length} gün)`}>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Tarih</Th>
                <Th align="right">Ücretli Adet</Th>
                <Th align="right">Yemekhane Nakiti</Th>
                <Th align="right">Misafir Adet</Th>
                <Th align="right">Misafir Tutarı</Th>
                <Th align="right">Tahsilat Adet</Th>
                <Th align="right">Tahsilat Tutarı</Th>
                <Th align="right">Gün Toplamı</Th>
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 && (
                <EmptyRow colSpan={8}>
                  Bu tarih aralığında nakit hareketi yok.
                </EmptyRow>
              )}
              {satirlar.map((r) => (
                <tr key={r.tarih} className="hover:bg-slate-50">
                  <Td className="font-medium">{tarih(r.tarih)}</Td>
                  <Td align="right">{r.ucretli_adet}</Td>
                  <Td
                    align="right"
                    className="text-lg font-bold text-emerald-700"
                  >
                    {para(r.ucretli_nakit)}
                  </Td>
                  <Td align="right" className="text-slate-500">
                    {r.misafir_adet}
                  </Td>
                  <Td align="right" className="text-slate-500">
                    {para(r.misafir_tutar)}
                  </Td>
                  <Td align="right">{r.tahsilat_adet}</Td>
                  <Td align="right" className="text-blue-700">
                    {para(r.tahsilat_tutar)}
                  </Td>
                  <Td align="right" className="font-semibold">
                    {para(r.gun_toplami)}
                  </Td>
                </tr>
              ))}
            </tbody>
            {satirlar.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-semibold">
                  <Td>TOPLAM</Td>
                  <Td align="right">{toplamUcretliAdet}</Td>
                  <Td align="right">{para(toplamNakit)}</Td>
                  <Td align="right">{toplamMisafir}</Td>
                  <Td align="right">
                    {para(
                      satirlar.reduce((a, r) => a + Number(r.misafir_tutar), 0),
                    )}
                  </Td>
                  <Td align="right">
                    {satirlar.reduce((a, r) => a + Number(r.tahsilat_adet), 0)}
                  </Td>
                  <Td align="right">{para(toplamTahsilat)}</Td>
                  <Td align="right">{para(toplamNakit + toplamTahsilat)}</Td>
                </tr>
              </tfoot>
            )}
          </Table>
        </TableWrap>
      </Card>

      <p className="mt-4 text-xs text-slate-500">
        <strong>Yemekhane nakiti</strong>, kapıda &quot;Ücretli&quot; butonuna
        basılarak alınan paradır — gün sonunda kasada olması gereken tutar.{" "}
        <strong>Tahsilat</strong> ise öğrenci hesabına işlenen ödemelerdir; bu
        ikisi ayrı takip edilir.
      </p>
    </>
  );
}

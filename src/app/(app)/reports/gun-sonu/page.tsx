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
import type { GunSonuSatir } from "@/lib/types";

export const metadata: Metadata = { title: "Gün Sonu Raporu" };

export default async function GunSonuPage({
  searchParams,
}: {
  searchParams: Promise<{ baslangic?: string; bitis?: string }>;
}) {
  const sp = await searchParams;
  const baslangic = sp.baslangic || ayinIlkGunu();
  const bitis = sp.bitis || ayinSonGunu();

  await getSessionUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("rapor_gun_sonu", {
    p_baslangic: baslangic,
    p_bitis: bitis,
    p_sinif: null,
  });

  const satirlar = (data ?? []) as GunSonuSatir[];

  const toplamOgun = satirlar.reduce((a, r) => a + Number(r.toplam_kisi), 0);
  const toplamCiro = satirlar.reduce((a, r) => a + Number(r.toplam_tutar), 0);
  const toplamNakit = satirlar.reduce((a, r) => a + Number(r.nakit_tutar), 0);
  const ortalama =
    satirlar.length > 0 ? Math.round(toplamOgun / satirlar.length) : 0;
  const enYogun = satirlar.reduce<GunSonuSatir | null>(
    (max, r) => (!max || Number(r.toplam_kisi) > Number(max.toplam_kisi) ? r : max),
    null,
  );

  return (
    <>
      <PageHeader
        title="Gün Sonu Raporu"
        description="Her gün yemekhanede kaç kişi yemek yediği"
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
          label="Toplam Öğün"
          value={toplamOgun}
          hint={`${satirlar.length} gün boyunca`}
          ton="blue"
        />
        <StatCard label="Günlük Ortalama" value={ortalama} hint="kişi/gün" />
        <StatCard
          label="En Yoğun Gün"
          value={enYogun ? enYogun.toplam_kisi : 0}
          hint={enYogun ? tarih(enYogun.tarih) : "—"}
        />
        <StatCard
          label="Yemekhane Nakiti"
          value={para(toplamNakit)}
          hint="Ücretli butonundan toplanan"
          ton="green"
        />
      </div>

      <Card title={`Gün bazlı döküm (${satirlar.length} gün)`}>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Tarih</Th>
                <Th align="right">Toplam Kişi</Th>
                <Th align="right">Günlükçü</Th>
                <Th align="right">Aylıkçı</Th>
                <Th align="right">Ücretli</Th>
                <Th align="right">Misafir</Th>
                <Th align="right">Nakit</Th>
                <Th align="right">Toplam Tutar</Th>
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 && (
                <EmptyRow colSpan={8}>
                  Bu tarih aralığında yemek kaydı yok.
                </EmptyRow>
              )}
              {satirlar.map((r) => (
                <tr key={r.tarih} className="hover:bg-slate-50">
                  <Td className="font-medium">{tarih(r.tarih)}</Td>
                  <Td align="right" className="text-lg font-bold">
                    {r.toplam_kisi}
                  </Td>
                  <Td align="right">
                    <span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-800">
                      {r.gunlukcu}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                      {r.aylikci}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
                      {r.ucretli}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="rounded bg-violet-100 px-2 py-0.5 font-medium text-violet-800">
                      {r.misafir}
                    </span>
                  </Td>
                  <Td align="right" className="font-semibold text-emerald-700">
                    {para(r.nakit_tutar)}
                  </Td>
                  <Td align="right">{para(r.toplam_tutar)}</Td>
                </tr>
              ))}
            </tbody>
            {satirlar.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-semibold">
                  <Td>TOPLAM</Td>
                  <Td align="right">{toplamOgun}</Td>
                  <Td align="right">
                    {satirlar.reduce((a, r) => a + Number(r.gunlukcu), 0)}
                  </Td>
                  <Td align="right">
                    {satirlar.reduce((a, r) => a + Number(r.aylikci), 0)}
                  </Td>
                  <Td align="right">
                    {satirlar.reduce((a, r) => a + Number(r.ucretli), 0)}
                  </Td>
                  <Td align="right">
                    {satirlar.reduce((a, r) => a + Number(r.misafir), 0)}
                  </Td>
                  <Td align="right">{para(toplamNakit)}</Td>
                  <Td align="right">{para(toplamCiro)}</Td>
                </tr>
              </tfoot>
            )}
          </Table>
        </TableWrap>
      </Card>

      <p className="mt-4 text-xs text-slate-500">
        <strong>Toplam Kişi</strong> = kayıtlı öğrenciler + ücretli + misafir.
        Kayıtlı öğrenciler tekil sayılır ve aynı güne ikinci kayıt zaten
        engellenir. <strong>Nakit</strong>, kapıda &quot;Ücretli&quot;
        butonundan toplanan paradır — gün gün dökümü için Nakit sekmesine bakın.
      </p>
    </>
  );
}

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
import { para, tarih } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { TaksitDurum, TaksitSatir } from "@/lib/types";

import { TaksitFilter } from "./taksit-filter";

export const metadata: Metadata = { title: "Taksit Takibi" };

const DURUM_STIL: Record<
  TaksitDurum,
  { etiket: string; hucre: string; rozet: string }
> = {
  odendi: {
    etiket: "Ödendi",
    hucre: "bg-emerald-50",
    rozet: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  },
  gecikmis: {
    etiket: "ÖDEME ALINMALI",
    hucre: "bg-rose-50",
    rozet: "bg-rose-600 text-white ring-rose-700",
  },
  bekliyor: {
    etiket: "Vadesi gelmedi",
    hucre: "",
    rozet: "bg-slate-100 text-slate-600 ring-slate-300",
  },
};

export default async function TaksitPage({
  searchParams,
}: {
  searchParams: Promise<{ yil?: string; sinif?: string; gecikmis?: string }>;
}) {
  const sp = await searchParams;
  const yil = Number(sp.yil) || new Date().getFullYear();
  const sinif = sp.sinif ?? "";
  const sadeceGecikmis = sp.gecikmis === "1";

  await getSessionUser();
  const supabase = await createClient();

  const [{ data, error }, { data: sinifData }, { count: planSayisi }] =
    await Promise.all([
      supabase.rpc("rapor_taksit", {
        p_yil: yil,
        p_sinif: sinif || null,
        p_sadece_gecikmis: sadeceGecikmis,
      }),
      supabase.rpc("sinif_listesi"),
      supabase
        .from("taksit_plani")
        .select("id", { count: "exact", head: true })
        .eq("yil", yil),
    ]);

  const satirlar = (data ?? []) as TaksitSatir[];
  const siniflar = ((sinifData ?? []) as { sinif: string }[]).map((s) => s.sinif);

  // Öğrenci bazlı grupla
  const gruplar = satirlar.reduce<Record<string, TaksitSatir[]>>((acc, r) => {
    (acc[r.student_id] ??= []).push(r);
    return acc;
  }, {});

  const gecikmisSatirlar = satirlar.filter((r) => r.durum === "gecikmis");
  const gecikmisOgrenci = new Set(
    gecikmisSatirlar.map((r) => r.student_id),
  ).size;
  const toplamEksik = Object.values(gruplar).reduce((a, kayitlar) => {
    // Kümülatif olduğu için öğrenci başına EN BÜYÜK eksik alınır
    const enBuyuk = kayitlar
      .filter((r) => r.durum === "gecikmis")
      .reduce((m, r) => Math.max(m, Number(r.eksik_tutar)), 0);
    return a + enBuyuk;
  }, 0);

  return (
    <>
      <PageHeader
        title="Taksit Takibi"
        description={`${yil} yılı — aylıkçı öğrencilerin ödeme durumu`}
      />

      <div className="no-print mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <TaksitFilter
          yil={yil}
          sinif={sinif}
          siniflar={siniflar}
          sadeceGecikmis={sadeceGecikmis}
        />
      </div>

      {error && (
        <div className="mb-4">
          <Alert>Rapor alınamadı: {error.message}</Alert>
        </div>
      )}

      {(planSayisi ?? 0) === 0 && (
        <div className="mb-4">
          <Alert ton="amber">
            {yil} yılı için taksit planı tanımlı değil.{" "}
            <Link
              href={`/admin/settings?yil=${yil}`}
              className="font-medium underline"
            >
              Ayarlar sayfasından vade tarihlerini ve tutarları girin
            </Link>
            .
          </Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Aylıkçı Öğrenci"
          value={Object.keys(gruplar).length}
          hint={sadeceGecikmis ? "filtrelenmiş" : "toplam"}
        />
        <StatCard
          label="Ödeme Alınmalı"
          value={gecikmisOgrenci}
          hint="Vadesi geçmiş, eksiği olan"
          ton={gecikmisOgrenci > 0 ? "red" : "green"}
        />
        <StatCard
          label="Tahsil Edilecek"
          value={para(toplamEksik)}
          hint="Vadesi geçmiş toplam eksik"
          ton={toplamEksik > 0 ? "red" : "slate"}
        />
      </div>

      <Card title="Öğrenci bazlı taksit durumu">
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Öğrenci</Th>
                <Th>Veli / Telefon</Th>
                <Th>Taksit</Th>
                <Th>Vade</Th>
                <Th align="right">Taksit Tutarı</Th>
                <Th align="right">O Tarihe Kadar Beklenen</Th>
                <Th align="right">Ödenen</Th>
                <Th align="right">Eksik</Th>
                <Th align="center">Durum</Th>
              </tr>
            </thead>
            <tbody>
              {satirlar.length === 0 && (
                <EmptyRow colSpan={9}>
                  {sadeceGecikmis
                    ? "Ödeme alınması gereken öğrenci yok — tüm taksitler güncel."
                    : "Gösterilecek kayıt yok. Aylıkçı öğrenci ve taksit planı tanımlı mı?"}
                </EmptyRow>
              )}
              {Object.entries(gruplar).map(([sid, kayitlar]) =>
                kayitlar.map((r, i) => {
                  const stil = DURUM_STIL[r.durum];
                  return (
                    <tr
                      key={`${sid}-${r.taksit_id}`}
                      className={cx("hover:bg-slate-50", stil.hucre)}
                    >
                      {i === 0 ? (
                        <>
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
                              {r.ogrenci_no}
                              {r.sinif ? ` · ${r.sinif}` : ""}
                            </div>
                          </Td>
                          <Td
                            className="align-top text-sm text-slate-600"
                            rowSpan={kayitlar.length}
                          >
                            {r.veli_adi || "-"}
                            {r.veli_telefon && (
                              <div className="text-xs text-slate-500">
                                {r.veli_telefon}
                              </div>
                            )}
                          </Td>
                        </>
                      ) : null}
                      <Td>{r.taksit_adi}</Td>
                      <Td>{tarih(r.vade_tarihi)}</Td>
                      <Td align="right">{para(r.taksit_tutari)}</Td>
                      <Td align="right" className="text-slate-600">
                        {para(r.kumulatif_beklenen)}
                      </Td>
                      <Td align="right" className="text-emerald-700">
                        {para(r.odenen)}
                        {Number(r.vadesinde_odenen) < Number(r.odenen) && (
                          <div
                            className="text-xs font-normal text-amber-700"
                            title="Bu tutarın bir kısmı vade tarihinden sonra tahsil edilmiş"
                          >
                            vadesinde {para(r.vadesinde_odenen)}
                          </div>
                        )}
                      </Td>
                      <Td
                        align="right"
                        className={
                          Number(r.eksik_tutar) > 0
                            ? "font-bold text-rose-700"
                            : "text-slate-400"
                        }
                      >
                        {para(r.eksik_tutar)}
                      </Td>
                      <Td align="center">
                        <span
                          className={cx(
                            "inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-bold ring-1 ring-inset",
                            stil.rozet,
                          )}
                        >
                          {stil.etiket}
                        </span>
                      </Td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <p className="mt-4 text-xs text-slate-500">
        <strong>Kümülatif hesap:</strong> her vade tarihinde, o tarihe kadar
        birikmiş taksit toplamı ile yıl içinde yapılan <strong>tüm</strong>{" "}
        tahsilat karşılaştırılır — vadeden sonra yapılan kısmi ödemeler de
        borcu azaltır. Örnek: 10.000 ₺ vadesi geçmiş taksite 5.000 ₺ ödeme
        yapılmışsa öğrenci <strong>5.000 ₺ eksikle</strong> hâlâ borçlu görünür.
        Ödemenin ne kadarının vadesi içinde yapıldığı &quot;Ödenen&quot;
        sütununun altında ayrıca gösterilir.{" "}
        <strong>ÖDEME ALINMALI</strong> = vade geçmiş ve eksik var.
      </p>
    </>
  );
}

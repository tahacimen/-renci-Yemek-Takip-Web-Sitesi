import type { Metadata } from "next";
import Link from "next/link";

import { DateRangeFilter } from "@/components/date-range-filter";
import {
  Alert,
  Badge,
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
import type { DashboardOzet } from "@/lib/types";

export const metadata: Metadata = { title: "Özet — Öğrenci Yemek Takip" };

type Params = Promise<{
  baslangic?: string;
  bitis?: string;
  hata?: string;
}>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const sp = await searchParams;
  const baslangic = sp.baslangic || ayinIlkGunu();
  const bitis = sp.bitis || ayinSonGunu();

  await getSessionUser();
  const supabase = await createClient();

  const [{ data: ozetData, error: ozetError }, { data: sonIslemler }] =
    await Promise.all([
      supabase.rpc("dashboard_ozet", {
        p_baslangic: baslangic,
        p_bitis: bitis,
      }),
      supabase
        .from("transactions")
        .select("id, tarih, tip, tutar, aciklama, students(ad_soyad, id)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const ozet: DashboardOzet | null =
    (ozetData as DashboardOzet[] | null)?.[0] ?? null;

  type SonIslem = {
    id: string;
    tarih: string;
    tip: "tahsilat" | "harcama";
    tutar: number;
    aciklama: string | null;
    students: { ad_soyad: string; id: string } | null;
  };
  const islemler = (sonIslemler ?? []) as unknown as SonIslem[];

  return (
    <>
      <PageHeader
        title="Genel Özet"
        description={`${tarih(baslangic)} – ${tarih(bitis)} dönemi`}
      />

      {sp.hata === "yetkisiz" && (
        <div className="mb-4">
          <Alert ton="amber">Bu sayfaya erişim yetkiniz yok.</Alert>
        </div>
      )}

      <div className="no-print mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <DateRangeFilter baslangic={baslangic} bitis={bitis} />
      </div>

      {ozetError && (
        <div className="mb-4">
          <Alert>Özet yüklenemedi: {ozetError.message}</Alert>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Toplam Tahsilat"
          value={para(ozet?.donem_tahsilat)}
          hint="Seçilen dönemde alınan para"
          ton="blue"
        />
        <StatCard
          label="Toplam Gelen"
          value={para(ozet?.toplam_gelen)}
          hint="Devir + bugüne kadarki tüm tahsilat"
          ton="green"
        />
        <StatCard
          label="Toplam Giden"
          value={para(ozet?.toplam_giden)}
          hint="Bugüne kadarki tüm harcama"
          ton="red"
        />
        <StatCard
          label="Toplam Kalan"
          value={para(ozet?.toplam_kalan)}
          hint="Gelen − Giden"
          ton={Number(ozet?.toplam_kalan ?? 0) < 0 ? "red" : "slate"}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Dönem Harcaması"
          value={para(ozet?.donem_harcama)}
          hint="Seçilen dönemde yenen yemek tutarı"
        />
        <StatCard label="Aktif Öğrenci" value={ozet?.aktif_ogrenci ?? 0} />
        <StatCard
          label="Borçlu Öğrenci"
          value={ozet?.borclu_ogrenci ?? 0}
          hint="Kalan bakiyesi eksi olanlar"
          ton={Number(ozet?.borclu_ogrenci ?? 0) > 0 ? "red" : "slate"}
        />
        <div className="flex flex-col justify-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <Link
            href="/payments/new"
            className="font-medium text-blue-700 hover:underline"
          >
            → Yeni tahsilat / harcama gir
          </Link>
          <Link
            href="/students?borc=borclu"
            className="font-medium text-blue-700 hover:underline"
          >
            → Borçlu öğrenci listesi
          </Link>
        </div>
      </div>

      <Card title="Son 10 işlem">
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Tarih</Th>
                <Th>Öğrenci</Th>
                <Th>Tip</Th>
                <Th align="right">Tutar</Th>
                <Th>Açıklama</Th>
              </tr>
            </thead>
            <tbody>
              {islemler.length === 0 && <EmptyRow colSpan={5} />}
              {islemler.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <Td>{tarih(t.tarih)}</Td>
                  <Td>
                    {t.students ? (
                      <Link
                        href={`/students/${t.students.id}`}
                        className="text-blue-700 hover:underline"
                      >
                        {t.students.ad_soyad}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </Td>
                  <Td>
                    <Badge ton={t.tip === "tahsilat" ? "green" : "amber"}>
                      {t.tip === "tahsilat" ? "Tahsilat" : "Harcama"}
                    </Badge>
                  </Td>
                  <Td align="right">{para(t.tutar)}</Td>
                  <Td className="text-slate-600">{t.aciklama || "-"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Card>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import {
  Alert,
  Badge,
  Card,
  EmptyRow,
  LinkButton,
  PageHeader,
  Table,
  TableWrap,
  Td,
  Th,
} from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { para } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { StudentBalance } from "@/lib/types";

import { StudentFilters } from "./student-filters";

export const metadata: Metadata = { title: "Öğrenciler — Öğrenci Yemek Takip" };

const SAYFA_BOYU = 50;

type Params = Promise<{
  q?: string;
  sinif?: string;
  borc?: string;
  durum?: string;
  sayfa?: string;
}>;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const sinif = sp.sinif ?? "";
  const borc = sp.borc ?? "";
  const durum = sp.durum ?? "";
  const sayfa = Math.max(1, Number(sp.sayfa ?? 1) || 1);

  await getSessionUser();
  const supabase = await createClient();

  let query = supabase
    .from("student_balances")
    .select("*", { count: "exact" })
    .order("ad_soyad");

  if (durum === "pasif") query = query.eq("aktif", false);
  else if (durum !== "hepsi") query = query.eq("aktif", true);

  if (sinif) query = query.eq("sinif", sinif);
  if (borc === "borclu") query = query.lt("kalan", 0);
  if (borc === "borcsuz") query = query.gte("kalan", 0);

  if (q) {
    // PostgREST or() içinde virgül ayraç olduğu için temizliyoruz
    const temiz = q.replace(/[,()]/g, " ").trim();
    query = query.or(`ad_soyad.ilike.%${temiz}%,ogrenci_no.ilike.%${temiz}%`);
  }

  const baslangicIndex = (sayfa - 1) * SAYFA_BOYU;
  const { data, error, count } = await query.range(
    baslangicIndex,
    baslangicIndex + SAYFA_BOYU - 1,
  );

  const ogrenciler = (data ?? []) as StudentBalance[];
  const toplam = count ?? 0;
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYU));

  // Varsayılan filtre pasif kayıtları gizler. "Kaydettim ama listede yok"
  // şaşkınlığına düşülmesin diye gizlenen kayıt sayısını da gösteriyoruz.
  let gizliPasifSayisi = 0;
  if (durum !== "pasif" && durum !== "hepsi") {
    const { count: pasif } = await supabase
      .from("student_balances")
      .select("student_id", { count: "exact", head: true })
      .eq("aktif", false);
    gizliPasifSayisi = pasif ?? 0;
  }

  const { data: sinifData } = await supabase.rpc("sinif_listesi");
  const siniflar = ((sinifData ?? []) as { sinif: string }[]).map(
    (s) => s.sinif,
  );

  function sayfaLinki(n: number, degisiklik?: { durum?: string }) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sinif) p.set("sinif", sinif);
    if (borc) p.set("borc", borc);
    const yeniDurum = degisiklik?.durum ?? durum;
    if (yeniDurum) p.set("durum", yeniDurum);
    p.set("sayfa", String(n));
    return `/students?${p.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Öğrenciler"
        description={`${toplam} kayıt bulundu`}
        actions={
          <LinkButton href="/students/new" variant="primary">
            + Yeni Öğrenci
          </LinkButton>
        }
      />

      <div className="no-print mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <StudentFilters
          siniflar={siniflar}
          degerler={{ q, sinif, borc, durum }}
        />
      </div>

      {error && (
        <div className="mb-4">
          <Alert>Liste yüklenemedi: {error.message}</Alert>
        </div>
      )}

      {gizliPasifSayisi > 0 && (
        <div className="no-print mb-4">
          <Alert ton="amber">
            <strong>{gizliPasifSayisi}</strong> pasif öğrenci bu listede
            gösterilmiyor. Görmek için &quot;Kayıt durumu&quot; filtresini{" "}
            <Link
              href={sayfaLinki(1, { durum: "hepsi" })}
              className="font-medium underline"
            >
              Hepsi
            </Link>{" "}
            yapın.
          </Alert>
        </div>
      )}

      <Card>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Öğrenci No</Th>
                <Th>Ad Soyad</Th>
                <Th align="center">Tip</Th>
                <Th>Sınıf</Th>
                <Th>Veli</Th>
                <Th align="right">Devir</Th>
                <Th align="right">Alınan Para</Th>
                <Th align="right">Harcanan</Th>
                <Th align="right">Kalan</Th>
                <Th align="center">Durum</Th>
              </tr>
            </thead>
            <tbody>
              {ogrenciler.length === 0 && (
                <EmptyRow colSpan={10}>
                  Filtrelere uyan öğrenci bulunamadı.
                </EmptyRow>
              )}
              {ogrenciler.map((s) => (
                <tr key={s.student_id} className="hover:bg-slate-50">
                  <Td className="tabular text-slate-600">{s.ogrenci_no}</Td>
                  <Td>
                    <Link
                      href={`/students/${s.student_id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {s.ad_soyad}
                    </Link>
                  </Td>
                  <Td align="center">
                    <span
                      className={
                        s.abone_tipi === "aylik"
                          ? "rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300"
                          : "rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-inset ring-blue-300"
                      }
                    >
                      {s.abone_tipi === "aylik" ? "Aylıkçı" : "Günlükçü"}
                    </span>
                  </Td>
                  <Td>{s.sinif || "-"}</Td>
                  <Td className="text-slate-600">
                    {s.veli_adi || "-"}
                    {s.veli_telefon && (
                      <span className="ml-1 text-xs text-slate-400">
                        {s.veli_telefon}
                      </span>
                    )}
                  </Td>
                  <Td align="right">{para(s.devir)}</Td>
                  <Td align="right">{para(s.alinan_para)}</Td>
                  <Td align="right">{para(s.harcanan)}</Td>
                  <Td
                    align="right"
                    className={
                      Number(s.kalan) < 0
                        ? "font-semibold text-rose-700"
                        : "font-semibold text-emerald-700"
                    }
                  >
                    {para(s.kalan)}
                  </Td>
                  <Td align="center">
                    {s.aktif ? (
                      <Badge ton="green">Aktif</Badge>
                    ) : (
                      <Badge ton="slate">Pasif</Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>

        {sonSayfa > 1 && (
          <div className="no-print flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-600">
              Sayfa {sayfa} / {sonSayfa}
            </span>
            <div className="flex gap-2">
              {sayfa > 1 && (
                <Link
                  href={sayfaLinki(sayfa - 1)}
                  className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-50"
                >
                  ← Önceki
                </Link>
              )}
              {sayfa < sonSayfa && (
                <Link
                  href={sayfaLinki(sayfa + 1)}
                  className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-50"
                >
                  Sonraki →
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

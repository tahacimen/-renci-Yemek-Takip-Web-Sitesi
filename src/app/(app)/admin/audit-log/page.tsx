import type { Metadata } from "next";
import Link from "next/link";

import {
  Alert,
  Card,
  EmptyRow,
  PageHeader,
  Table,
  TableWrap,
  Th,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AuditLogRow, Profile } from "@/lib/types";

import { AuditRow } from "./audit-row";

export const metadata: Metadata = { title: "İşlem Kayıtları" };

const SAYFA_BOYU = 50;

type Params = Promise<{ tablo?: string; islem?: string; sayfa?: string }>;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const sp = await searchParams;
  const tablo = sp.tablo ?? "";
  const islem = sp.islem ?? "";
  const sayfa = Math.max(1, Number(sp.sayfa ?? 1) || 1);

  await requireAdmin();
  const supabase = await createClient();

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("tarih", { ascending: false });

  if (tablo) query = query.eq("tablo_adi", tablo);
  if (islem) query = query.eq("islem_tipi", islem);

  const bas = (sayfa - 1) * SAYFA_BOYU;
  const { data, error, count } = await query.range(bas, bas + SAYFA_BOYU - 1);

  const kayitlar = (data ?? []) as AuditLogRow[];
  const toplam = count ?? 0;
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYU));

  const userIds = [
    ...new Set(
      kayitlar.map((k) => k.user_id).filter((v): v is string => Boolean(v)),
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

  function link(yeni: Record<string, string>) {
    const p = new URLSearchParams();
    if (tablo) p.set("tablo", tablo);
    if (islem) p.set("islem", islem);
    Object.entries(yeni).forEach(([k, v]) => {
      if (v) p.set(k, v);
      else p.delete(k);
    });
    return `/admin/audit-log?${p.toString()}`;
  }

  const filtreler: { etiket: string; params: Record<string, string> }[] = [
    { etiket: "Hepsi", params: { tablo: "", islem: "", sayfa: "1" } },
    { etiket: "Öğrenci", params: { tablo: "students", sayfa: "1" } },
    { etiket: "İşlemler", params: { tablo: "transactions", sayfa: "1" } },
    { etiket: "Sadece silme", params: { islem: "delete", sayfa: "1" } },
    { etiket: "Sadece düzeltme", params: { islem: "update", sayfa: "1" } },
  ];

  return (
    <>
      <PageHeader
        title="İşlem Kayıtları (Audit Log)"
        description={`Tüm düzeltme ve silme işlemlerinin geçmişi — ${toplam} kayıt`}
      />

      <div className="no-print mb-5 flex flex-wrap gap-2">
        {filtreler.map((f) => (
          <Link
            key={f.etiket}
            href={
              f.etiket === "Hepsi"
                ? "/admin/audit-log"
                : link(f.params as Record<string, string>)
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            {f.etiket}
          </Link>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <Alert>Kayıtlar yüklenemedi: {error.message}</Alert>
        </div>
      )}

      <Card>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Tarih / Saat</Th>
                <Th>Yapan</Th>
                <Th>İşlem</Th>
                <Th>Tablo</Th>
                <Th>Kayıt</Th>
                <Th align="center">Detay</Th>
              </tr>
            </thead>
            <tbody>
              {kayitlar.length === 0 && (
                <EmptyRow colSpan={6}>
                  Henüz kayıtlı bir düzeltme veya silme işlemi yok.
                </EmptyRow>
              )}
              {kayitlar.map((k) => (
                <AuditRow
                  key={k.id}
                  kayit={k}
                  yapanAd={
                    k.user_id ? (adMap.get(k.user_id) ?? "Bilinmeyen") : "Sistem"
                  }
                />
              ))}
            </tbody>
          </Table>
        </TableWrap>

        {sonSayfa > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-600">
              Sayfa {sayfa} / {sonSayfa}
            </span>
            <div className="flex gap-2">
              {sayfa > 1 && (
                <Link
                  href={link({ sayfa: String(sayfa - 1) })}
                  className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-50"
                >
                  ← Önceki
                </Link>
              )}
              {sayfa < sonSayfa && (
                <Link
                  href={link({ sayfa: String(sayfa + 1) })}
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

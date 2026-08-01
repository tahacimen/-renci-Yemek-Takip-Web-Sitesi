"use client";

import { useState } from "react";

import { Badge, Td } from "@/components/ui";
import { tarihSaat } from "@/lib/format";
import type { AuditLogRow } from "@/lib/types";

const TABLO_ADLARI: Record<string, string> = {
  students: "Öğrenci",
  transactions: "İşlem",
  profiles: "Kullanıcı",
  app_settings: "Ayarlar",
};

const ISLEM_ADLARI: Record<string, { etiket: string; ton: "amber" | "red" | "green" }> =
  {
    update: { etiket: "Düzeltme", ton: "amber" },
    delete: { etiket: "Silme", ton: "red" },
    insert: { etiket: "Ekleme", ton: "green" },
  };

/** İki jsonb arasındaki farklı alanları bulur. */
function farklar(
  eski: Record<string, unknown> | null,
  yeni: Record<string, unknown> | null,
) {
  if (!eski || !yeni) return [];
  const anahtarlar = new Set([...Object.keys(eski), ...Object.keys(yeni)]);
  const liste: { alan: string; eski: unknown; yeni: unknown }[] = [];
  for (const a of anahtarlar) {
    if (a === "updated_at") continue;
    if (JSON.stringify(eski[a]) !== JSON.stringify(yeni[a])) {
      liste.push({ alan: a, eski: eski[a], yeni: yeni[a] });
    }
  }
  return liste;
}

function goster(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function AuditRow({
  kayit,
  yapanAd,
}: {
  kayit: AuditLogRow;
  yapanAd: string;
}) {
  const [acik, setAcik] = useState(false);
  const islem = ISLEM_ADLARI[kayit.islem_tipi] ?? {
    etiket: kayit.islem_tipi,
    ton: "amber" as const,
  };
  const degisenler = farklar(kayit.eski_deger, kayit.yeni_deger);

  return (
    <>
      <tr className="hover:bg-slate-50">
        <Td className="whitespace-nowrap text-slate-600">
          {tarihSaat(kayit.tarih)}
        </Td>
        <Td>{yapanAd}</Td>
        <Td>
          <Badge ton={islem.ton}>{islem.etiket}</Badge>
        </Td>
        <Td>{TABLO_ADLARI[kayit.tablo_adi] ?? kayit.tablo_adi}</Td>
        <Td className="text-xs text-slate-500">
          {kayit.kayit_id ? kayit.kayit_id.slice(0, 8) + "…" : "—"}
        </Td>
        <Td align="center">
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-blue-700 hover:bg-blue-50"
            onClick={() => setAcik((a) => !a)}
          >
            {acik ? "Gizle" : "Detay"}
          </button>
        </Td>
      </tr>

      {acik && (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-4 py-3">
            {kayit.islem_tipi === "update" && degisenler.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-1 pr-4 font-medium">Alan</th>
                    <th className="py-1 pr-4 font-medium">Eski değer</th>
                    <th className="py-1 font-medium">Yeni değer</th>
                  </tr>
                </thead>
                <tbody>
                  {degisenler.map((d) => (
                    <tr key={d.alan} className="border-t border-slate-200">
                      <td className="py-1 pr-4 font-medium text-slate-700">
                        {d.alan}
                      </td>
                      <td className="py-1 pr-4 text-rose-700 line-through">
                        {goster(d.eski)}
                      </td>
                      <td className="py-1 text-emerald-700">
                        {goster(d.yeni)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <pre className="overflow-x-auto rounded bg-white p-3 text-xs text-slate-700 ring-1 ring-slate-200">
                {JSON.stringify(
                  kayit.eski_deger ?? kayit.yeni_deger ?? {},
                  null,
                  2,
                )}
              </pre>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

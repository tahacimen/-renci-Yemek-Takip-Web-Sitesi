"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Alert,
  Button,
  EmptyRow,
  Input,
  Table,
  TableWrap,
  Td,
  Th,
} from "@/components/ui";
import { para, tarih } from "@/lib/format";
import type { TaksitPlani } from "@/lib/types";

import { taksitKaydet, taksitSil } from "./actions";

export function TaksitForm({
  taksitler,
  yil,
}: {
  taksitler: TaksitPlani[];
  yil: number;
}) {
  const router = useRouter();
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [yeni, setYeni] = useState({ ad: "", vade_tarihi: "", tutar: "" });

  const toplam = taksitler.reduce((a, t) => a + Number(t.tutar), 0);

  function ekle() {
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await taksitKaydet({ ...yeni, yil });
      if (sonuc.ok) {
        setYeni({ ad: "", vade_tarihi: "", tutar: "" });
        setMesaj({ ok: true, text: sonuc.mesaj ?? "Eklendi." });
        router.refresh();
      } else {
        setMesaj({ ok: false, text: sonuc.hata });
      }
    });
  }

  function sil(id: string, ad: string) {
    if (!window.confirm(`"${ad}" taksiti silinsin mi?`)) return;
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await taksitSil(id);
      setMesaj(
        sonuc.ok
          ? { ok: true, text: sonuc.mesaj ?? "Silindi." }
          : { ok: false, text: sonuc.hata },
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 p-4">
      {mesaj && <Alert ton={mesaj.ok ? "green" : "red"}>{mesaj.text}</Alert>}

      <p className="text-sm text-slate-600">
        Aylıkçı öğrencilerin yıllık ücreti bu takvime göre takip edilir. Örnek:
        yıllık 30.000 ₺ için Şubat / Mart / Haziran vadeli üçer 10.000 ₺.
        Taksit raporu, her vade tarihine kadar yapılan tahsilatı bu tutarlarla
        karşılaştırır.
      </p>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Taksit adı</Th>
              <Th>Vade tarihi</Th>
              <Th align="right">Tutar</Th>
              <Th align="center">İşlem</Th>
            </tr>
          </thead>
          <tbody>
            {taksitler.length === 0 && (
              <EmptyRow colSpan={4}>
                {yil} yılı için tanımlı taksit yok.
              </EmptyRow>
            )}
            {taksitler.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <Td className="font-medium">{t.ad}</Td>
                <Td>{tarih(t.vade_tarihi)}</Td>
                <Td align="right">{para(t.tutar)}</Td>
                <Td align="center">
                  <Button
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50"
                    disabled={pending}
                    onClick={() => sil(t.id, t.ad)}
                  >
                    Sil
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
          {taksitler.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-semibold">
                <Td>YILLIK TOPLAM</Td>
                <Td />
                <Td align="right">{para(toplam)}</Td>
                <Td />
              </tr>
            </tfoot>
          )}
        </Table>
      </TableWrap>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          {yil} yılına taksit ekle
        </h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_11rem_9rem_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Taksit adı
            </span>
            <Input
              value={yeni.ad}
              placeholder="Örn. 1. Taksit (Şubat)"
              onChange={(e) => setYeni({ ...yeni, ad: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Vade tarihi
            </span>
            <Input
              type="date"
              value={yeni.vade_tarihi}
              onChange={(e) =>
                setYeni({ ...yeni, vade_tarihi: e.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Tutar (₺)
            </span>
            <Input
              inputMode="decimal"
              value={yeni.tutar}
              placeholder="10000"
              onChange={(e) => setYeni({ ...yeni, tutar: e.target.value })}
            />
          </label>
          <Button type="button" onClick={ekle} disabled={pending}>
            {pending ? "…" : "Ekle"}
          </Button>
        </div>
      </div>
    </div>
  );
}

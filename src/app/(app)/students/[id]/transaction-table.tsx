"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Alert,
  Badge,
  Button,
  EmptyRow,
  Input,
  Select,
  Table,
  TableWrap,
  Td,
  Th,
} from "@/components/ui";
import { para, tarih } from "@/lib/format";
import { islemGuncelle, islemSil } from "@/lib/transaction-actions";
import type { Transaction } from "@/lib/types";

export type IslemSatiri = Transaction & { yapan_ad?: string | null };

export function TransactionTable({
  islemler,
  studentId,
  isAdmin,
}: {
  islemler: IslemSatiri[];
  studentId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const kolonSayisi = isAdmin ? 6 : 5;

  function kaydet(id: string, form: HTMLFormElement) {
    const fd = new FormData(form);
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await islemGuncelle(id, {
        student_id: studentId,
        tarih: String(fd.get("tarih") ?? ""),
        tip: String(fd.get("tip") ?? ""),
        tutar: String(fd.get("tutar") ?? ""),
        aciklama: String(fd.get("aciklama") ?? ""),
      });
      if (sonuc.ok) {
        setDuzenlenen(null);
        setMesaj({ ok: true, text: sonuc.mesaj ?? "Güncellendi." });
        router.refresh();
      } else {
        setMesaj({ ok: false, text: sonuc.hata });
      }
    });
  }

  function sil(id: string) {
    if (
      !window.confirm(
        "Bu kaydı silmek istediğinize emin misiniz? İşlem geri alınamaz ancak işlem kayıtlarına düşer.",
      )
    ) {
      return;
    }
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await islemSil(id, studentId);
      if (sonuc.ok) {
        setMesaj({ ok: true, text: sonuc.mesaj ?? "Silindi." });
        router.refresh();
      } else {
        setMesaj({ ok: false, text: sonuc.hata });
      }
    });
  }

  return (
    <div>
      {mesaj && (
        <div className="border-b border-slate-200 p-3">
          <Alert ton={mesaj.ok ? "green" : "red"}>{mesaj.text}</Alert>
        </div>
      )}

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Tarih</Th>
              <Th>Tip</Th>
              <Th align="right">Tutar</Th>
              <Th>Açıklama</Th>
              <Th>Kaydeden</Th>
              {isAdmin && <Th align="center">İşlem</Th>}
            </tr>
          </thead>
          <tbody>
            {islemler.length === 0 && (
              <EmptyRow colSpan={kolonSayisi}>
                Bu öğrenci için henüz işlem kaydı yok.
              </EmptyRow>
            )}

            {islemler.map((t) =>
              duzenlenen === t.id ? (
                <tr key={t.id} className="bg-amber-50">
                  <td colSpan={kolonSayisi} className="px-3 py-3">
                    <form
                      className="flex flex-wrap items-end gap-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        kaydet(t.id, e.currentTarget);
                      }}
                    >
                      <label className="block">
                        <span className="mb-1 block text-xs text-slate-600">
                          Tarih
                        </span>
                        <Input
                          type="date"
                          name="tarih"
                          defaultValue={t.tarih}
                          className="w-40"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-slate-600">
                          Tip
                        </span>
                        <Select name="tip" defaultValue={t.tip} className="w-36">
                          <option value="tahsilat">Tahsilat</option>
                          <option value="harcama">Harcama</option>
                        </Select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-slate-600">
                          Tutar
                        </span>
                        <Input
                          name="tutar"
                          inputMode="decimal"
                          defaultValue={String(t.tutar)}
                          className="w-32"
                        />
                      </label>
                      <label className="block grow">
                        <span className="mb-1 block text-xs text-slate-600">
                          Açıklama
                        </span>
                        <Input
                          name="aciklama"
                          defaultValue={t.aciklama ?? ""}
                        />
                      </label>
                      <Button type="submit" disabled={pending}>
                        Kaydet
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setDuzenlenen(null)}
                      >
                        Vazgeç
                      </Button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={t.id} className="hover:bg-slate-50">
                  <Td>{tarih(t.tarih)}</Td>
                  <Td>
                    <Badge ton={t.tip === "tahsilat" ? "green" : "amber"}>
                      {t.tip === "tahsilat" ? "Tahsilat" : "Harcama"}
                    </Badge>
                  </Td>
                  <Td
                    align="right"
                    className={
                      t.tip === "tahsilat"
                        ? "font-medium text-emerald-700"
                        : "font-medium text-rose-700"
                    }
                  >
                    {t.tip === "tahsilat" ? "+" : "−"}
                    {para(t.tutar)}
                  </Td>
                  <Td className="text-slate-600">{t.aciklama || "-"}</Td>
                  <Td className="text-xs text-slate-500">
                    {t.yapan_ad || "-"}
                  </Td>
                  {isAdmin && (
                    <Td align="center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          onClick={() => setDuzenlenen(t.id)}
                          disabled={pending}
                        >
                          Düzelt
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => sil(t.id)}
                          disabled={pending}
                        >
                          Sil
                        </Button>
                      </div>
                    </Td>
                  )}
                </tr>
              ),
            )}
          </tbody>
        </Table>
      </TableWrap>

      {!isAdmin && islemler.length > 0 && (
        <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
          Var olan kayıtları yalnızca yönetici düzeltebilir veya silebilir.
        </p>
      )}
    </div>
  );
}

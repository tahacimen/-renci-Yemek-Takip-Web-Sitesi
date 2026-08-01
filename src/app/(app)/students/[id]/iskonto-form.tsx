"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert, Button, Field, Input } from "@/components/ui";
import { efektifGunlukUcret, para } from "@/lib/format";
import { iskontoSchema, type IskontoInput } from "@/lib/schemas";

import { iskontoGuncelle } from "../actions";

export function IskontoForm({
  studentId,
  iskontoOrani,
  iskontoTutar,
  devir,
  tabanUcret,
}: {
  studentId: string;
  iskontoOrani: number;
  iskontoTutar: number;
  devir: number;
  tabanUcret: number;
}) {
  const router = useRouter();
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IskontoInput>({
    resolver: zodResolver(iskontoSchema),
    defaultValues: {
      student_id: studentId,
      iskonto_orani: iskontoOrani,
      iskonto_tutar: iskontoTutar,
      devir: devir,
    },
  });

  const oran = Number(String(watch("iskonto_orani") ?? 0).replace(",", ".")) || 0;
  const tutar = Number(String(watch("iskonto_tutar") ?? 0).replace(",", ".")) || 0;
  const efektif = efektifGunlukUcret(tabanUcret, oran, tutar);

  const onSubmit = handleSubmit((values) => {
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await iskontoGuncelle(values);
      setMesaj(
        sonuc.ok
          ? { ok: true, text: sonuc.mesaj ?? "Kaydedildi." }
          : { ok: false, text: sonuc.hata },
      );
      if (sonuc.ok) router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-4" noValidate>
      <input type="hidden" {...register("student_id")} />

      {mesaj && <Alert ton={mesaj.ok ? "green" : "red"}>{mesaj.text}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="İskonto Oranı (%)"
          hata={errors.iskonto_orani?.message as string | undefined}
        >
          <Input inputMode="decimal" {...register("iskonto_orani")} />
        </Field>
        <Field
          label="İskonto Tutarı (₺)"
          hata={errors.iskonto_tutar?.message as string | undefined}
        >
          <Input inputMode="decimal" {...register("iskonto_tutar")} />
        </Field>
        <Field
          label="Devir"
          hata={errors.devir?.message as string | undefined}
          hint="Önceki dönemden taşınan bakiye"
        >
          <Input inputMode="decimal" {...register("devir")} />
        </Field>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        Taban günlük ücret <strong>{para(tabanUcret)}</strong> → efektif günlük
        ücret <strong>{para(efektif)}</strong>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </form>
  );
}

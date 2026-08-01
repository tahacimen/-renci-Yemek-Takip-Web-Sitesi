"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert, Button, Field, Input } from "@/components/ui";
import { ayarSchema, type AyarInput } from "@/lib/schemas";

import { ayarGuncelle } from "./actions";

export function SettingsForm({
  tabanUcret,
  ucretliUcret,
  misafirUcret,
}: {
  tabanUcret: number;
  ucretliUcret: number;
  misafirUcret: number;
}) {
  const router = useRouter();
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AyarInput>({
    resolver: zodResolver(ayarSchema),
    defaultValues: {
      taban_gunluk_ucret: tabanUcret,
      ucretli_ogun_ucreti: ucretliUcret,
      misafir_ogun_ucreti: misafirUcret,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await ayarGuncelle(values);
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
      {mesaj && <Alert ton={mesaj.ok ? "green" : "red"}>{mesaj.text}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Taban günlük ücret (₺)"
          hata={errors.taban_gunluk_ucret?.message as string | undefined}
          hint="Günlükçü öğrencilerin iskontosu bu tutar üzerinden hesaplanır."
        >
          <Input inputMode="decimal" {...register("taban_gunluk_ucret")} />
        </Field>

        <Field
          label="Ücretli öğün (₺)"
          hata={errors.ucretli_ogun_ucreti?.message as string | undefined}
          hint="Yemekhanede nakit ödeyen için. 0 bırakırsanız taban ücret kullanılır."
        >
          <Input inputMode="decimal" {...register("ucretli_ogun_ucreti")} />
        </Field>

        <Field
          label="Misafir öğün (₺)"
          hata={errors.misafir_ogun_ucreti?.message as string | undefined}
          hint="Personel / ziyaretçi. 0 ise ücretsiz sayılır, yalnızca sayıma girer."
        >
          <Input inputMode="decimal" {...register("misafir_ogun_ucreti")} />
        </Field>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </form>
  );
}

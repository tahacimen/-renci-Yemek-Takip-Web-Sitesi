"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { efektifGunlukUcret, para } from "@/lib/format";
import { ogrenciSchema, type OgrenciInput } from "@/lib/schemas";
import type { Student } from "@/lib/types";

import { ogrenciEkle, ogrenciGuncelle } from "./actions";

export function StudentForm({
  ogrenci,
  tabanUcret,
  isAdmin,
}: {
  ogrenci?: Student;
  tabanUcret: number;
  /** İskonto ve devir alanları yalnızca yöneticiye gösterilir. */
  isAdmin: boolean;
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
  } = useForm<OgrenciInput>({
    resolver: zodResolver(ogrenciSchema),
    defaultValues: {
      ogrenci_no: ogrenci?.ogrenci_no ?? "",
      ad_soyad: ogrenci?.ad_soyad ?? "",
      sinif: ogrenci?.sinif ?? "",
      kimlik_no: ogrenci?.kimlik_no ?? "",
      veli_adi: ogrenci?.veli_adi ?? "",
      veli_telefon: ogrenci?.veli_telefon ?? "",
      iskonto_orani: ogrenci?.iskonto_orani ?? 0,
      iskonto_tutar: ogrenci?.iskonto_tutar ?? 0,
      devir: ogrenci?.devir ?? 0,
      aktif: ogrenci?.aktif ?? true,
      abone_tipi: ogrenci?.abone_tipi ?? "gunluk",
    },
  });

  const aboneTipi = watch("abone_tipi");

  const oran = Number(String(watch("iskonto_orani") ?? 0).replace(",", ".")) || 0;
  const tutar = Number(String(watch("iskonto_tutar") ?? 0).replace(",", ".")) || 0;
  const efektif = efektifGunlukUcret(tabanUcret, oran, tutar);

  const onSubmit = handleSubmit((values) => {
    setMesaj(null);
    startTransition(async () => {
      const sonuc = ogrenci
        ? await ogrenciGuncelle(ogrenci.id, values)
        : await ogrenciEkle(values);

      if (!sonuc.ok) {
        setMesaj({ ok: false, text: sonuc.hata });
      } else {
        setMesaj({ ok: true, text: sonuc.mesaj ?? "Kaydedildi." });
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5 p-4" noValidate>
      {mesaj && (
        <Alert ton={mesaj.ok ? "green" : "red"}>{mesaj.text}</Alert>
      )}

      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold text-slate-700">
          Öğrenci bilgileri
        </legend>
        <Field label="Öğrenci No *" hata={errors.ogrenci_no?.message}>
          <Input {...register("ogrenci_no")} />
        </Field>
        <Field label="Ad Soyad *" hata={errors.ad_soyad?.message}>
          <Input {...register("ad_soyad")} />
        </Field>
        <Field label="Sınıf" hata={errors.sinif?.message}>
          <Input placeholder="Örn. 5-A" {...register("sinif")} />
        </Field>
        <Field label="Kimlik No" hata={errors.kimlik_no?.message}>
          <Input {...register("kimlik_no")} />
        </Field>
        <Field label="Durum">
          {/* Dönüştürme şemada (boolAlan) yapılıyor; setValueAs kullanmayın —
              RHF buraya bazen boolean geçiyor ve karşılaştırma bozuluyor. */}
          <Select {...register("aktif")}>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </Select>
        </Field>

        <Field
          label="Abone tipi *"
          hint={
            aboneTipi === "aylik"
              ? "Ücreti taksitle tahsil edilir; yemek yediğinde krediden düşülmez."
              : "Her yemekte iskontolu günlük ücreti krediden düşülür."
          }
        >
          <Select {...register("abone_tipi")}>
            <option value="gunluk">Günlükçü (mavi)</option>
            <option value="aylik">Aylıkçı (sarı)</option>
          </Select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold text-slate-700">
          Veli bilgileri
        </legend>
        <Field label="Veli Adı" hata={errors.veli_adi?.message}>
          <Input {...register("veli_adi")} />
        </Field>
        <Field label="Veli Telefon" hata={errors.veli_telefon?.message}>
          <Input placeholder="05xx xxx xx xx" {...register("veli_telefon")} />
        </Field>
      </fieldset>

      {!isAdmin ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          İskonto ve devir alanları yönetici tarafından tanımlanır. Bu öğrenci
          iskontosuz ve devirsiz (0) kaydedilecek.
        </div>
      ) : (
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold text-slate-700">
          İskonto ve devir
        </legend>
        <Field
          label="İskonto Oranı (%)"
          hata={errors.iskonto_orani?.message as string | undefined}
        >
          <Input
            inputMode="decimal"
            {...register("iskonto_orani")}
          />
        </Field>
        <Field
          label="İskonto Tutarı (₺)"
          hata={errors.iskonto_tutar?.message as string | undefined}
        >
          <Input inputMode="decimal" {...register("iskonto_tutar")} />
        </Field>
        <Field
          label="Devir (önceki dönem bakiyesi)"
          hata={errors.devir?.message as string | undefined}
          hint="Eksi değer borç, artı değer alacak anlamına gelir."
        >
          <Input inputMode="decimal" {...register("devir")} />
        </Field>

        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 sm:col-span-2 lg:col-span-3">
          Taban günlük ücret <strong>{para(tabanUcret)}</strong> — bu öğrencinin
          efektif günlük ücreti: <strong>{para(efektif)}</strong>
        </div>
      </fieldset>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : ogrenci ? "Değişiklikleri kaydet" : "Öğrenciyi kaydet"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={pending}
        >
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

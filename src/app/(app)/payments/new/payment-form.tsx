"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  StudentAutocomplete,
  type SecilenOgrenci,
} from "@/components/student-autocomplete";
import { Alert, Button, Field, Input, Textarea, cx } from "@/components/ui";
import { isoTarih, para } from "@/lib/format";
import { islemGirisSchema, type IslemGirisInput } from "@/lib/schemas";
import { islemEkle } from "@/lib/transaction-actions";

export function PaymentForm({
  baslangicOgrenci,
  tabanUcret,
}: {
  baslangicOgrenci: SecilenOgrenci | null;
  tabanUcret: number;
}) {
  const router = useRouter();
  const [ogrenci, setOgrenci] = useState<SecilenOgrenci | null>(
    baslangicOgrenci,
  );
  const [sonuc, setSonuc] = useState<{
    ok: boolean;
    text: string;
    studentId?: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<IslemGirisInput>({
    resolver: zodResolver(islemGirisSchema),
    defaultValues: {
      student_id: baslangicOgrenci?.student_id ?? "",
      tip: "tahsilat",
      tarih: isoTarih(new Date()),
      tutar: "",
      gun_sayisi: 1,
      aciklama: "",
    },
  });

  const tip = watch("tip");
  const gunSayisi = Number(watch("gun_sayisi") ?? 1) || 1;

  const gunlukUcret = ogrenci ? Number(ogrenci.efektif_gunluk_ucret) : 0;
  const hesaplananTutar = Math.round(gunlukUcret * gunSayisi * 100) / 100;
  const ucretTanimsiz = tip === "harcama" && !!ogrenci && !(gunlukUcret > 0);

  const onSubmit = handleSubmit((values) => {
    setSonuc(null);
    startTransition(async () => {
      const cevap = await islemEkle(values);
      if (cevap.ok) {
        setSonuc({
          ok: true,
          text: cevap.mesaj ?? "Kaydedildi.",
          studentId: values.student_id,
        });
        // Aynı öğrenciye peş peşe kayıt girilebilsin diye öğrenci seçili kalır
        reset({
          student_id: values.student_id,
          tip: values.tip,
          tarih: values.tarih,
          tutar: "",
          gun_sayisi: 1,
          aciklama: "",
        });
        router.refresh();
      } else {
        setSonuc({ ok: false, text: cevap.hata });
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5 p-4" noValidate>
      {sonuc && (
        <Alert ton={sonuc.ok ? "green" : "red"}>
          {sonuc.text}
          {sonuc.ok && sonuc.studentId && (
            <>
              {" "}
              <Link
                href={`/students/${sonuc.studentId}`}
                className="font-medium underline"
              >
                Öğrenci detayına git
              </Link>
            </>
          )}
        </Alert>
      )}

      <Controller
        control={control}
        name="student_id"
        render={({ field }) => (
          <StudentAutocomplete
            secilen={ogrenci}
            hata={errors.student_id?.message}
            onSecim={(o) => {
              setOgrenci(o);
              field.onChange(o?.student_id ?? "");
            }}
          />
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            İşlem tipi *
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["tahsilat", "Tahsilat (para alındı)"],
                ["harcama", "Harcama (yemek yendi)"],
              ] as const
            ).map(([deger, etiket]) => (
              <label
                key={deger}
                className={cx(
                  "cursor-pointer rounded-md border px-3 py-2 text-center text-sm font-medium transition",
                  tip === deger
                    ? deger === "tahsilat"
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                      : "border-amber-400 bg-amber-50 text-amber-800"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                <input
                  type="radio"
                  value={deger}
                  className="sr-only"
                  {...register("tip")}
                />
                {etiket}
              </label>
            ))}
          </div>
          {errors.tip && (
            <span className="mt-1 block text-xs text-rose-600">
              {errors.tip.message}
            </span>
          )}
        </div>

        <Field label="Tarih *" hata={errors.tarih?.message}>
          <Input type="date" {...register("tarih")} />
        </Field>

        {/* Tahsilatta tutar elle girilir; harcamada sistem hesaplar. */}
        {tip === "tahsilat" ? (
          <Field
            label="Tutar (₺) *"
            hata={errors.tutar?.message as string | undefined}
            hint="Veliden alınan tutarı yazın"
          >
            <Input
              inputMode="decimal"
              placeholder="0,00"
              {...register("tutar")}
            />
          </Field>
        ) : (
          <Field
            label="Gün sayısı *"
            hata={errors.gun_sayisi?.message as string | undefined}
            hint="Kaç günlük yemek bedeli işlensin?"
          >
            <Input
              type="number"
              min={1}
              max={31}
              step={1}
              {...register("gun_sayisi")}
            />
          </Field>
        )}
      </div>

      {/* Harcamada hesaplanan tutarın önizlemesi */}
      {tip === "harcama" && (
        <div
          className={cx(
            "rounded-md border px-3 py-3 text-sm",
            ucretTanimsiz
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-blue-200 bg-blue-50 text-blue-900",
          )}
        >
          {!ogrenci ? (
            <>Tutar, öğrenci seçildikten sonra günlük ücretinden hesaplanacak.</>
          ) : ucretTanimsiz ? (
            <>
              Bu öğrencinin günlük ücreti <strong>{para(0)}</strong> görünüyor,
              harcama kaydedilemez.{" "}
              <Link href="/admin/settings" className="font-medium underline">
                Ayarlar
              </Link>{" "}
              sayfasından taban günlük ücreti girin.
            </>
          ) : (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span>
                Günlük ücret <strong>{para(gunlukUcret)}</strong>
                {ogrenci.efektif_gunluk_ucret !== tabanUcret && (
                  <span className="opacity-70">
                    {" "}
                    (taban {para(tabanUcret)}, iskonto uygulandı)
                  </span>
                )}{" "}
                × {gunSayisi} gün
              </span>
              <span className="text-lg font-semibold">
                = {para(hesaplananTutar)}
              </span>
            </div>
          )}
        </div>
      )}

      <Field label="Açıklama" hata={errors.aciklama?.message}>
        <Textarea
          rows={2}
          placeholder={
            tip === "harcama"
              ? "Boş bırakırsanız otomatik yazılır (örn. 5 gün yemek)"
              : "Örn. Ekim ayı ödemesi / elden tahsilat"
          }
          {...register("aciklama")}
        />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || ucretTanimsiz}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => {
            setOgrenci(null);
            setSonuc(null);
            reset({
              student_id: "",
              tip: "tahsilat",
              tarih: isoTarih(new Date()),
              tutar: "",
              gun_sayisi: 1,
              aciklama: "",
            });
          }}
        >
          Formu temizle
        </Button>
      </div>
    </form>
  );
}

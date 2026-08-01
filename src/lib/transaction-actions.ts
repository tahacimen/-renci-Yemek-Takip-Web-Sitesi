"use server";

import { revalidatePath } from "next/cache";

import {
  basarili,
  basarisiz,
  hataMetni,
  type ActionResult,
} from "@/lib/action-result";
import { getSessionUser } from "@/lib/auth";
import { islemGirisSchema, islemSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

/**
 * Tahsilat / harcama kaydı ekler.
 * admin ve personel yapabilir (RLS: transactions_insert).
 *
 * HARCAMA tutarı istemciden ALINMAZ: öğrencinin iskontolu günlük ücreti
 * veritabanından okunup gün sayısıyla çarpılır. Tarayıcıdan gönderilen bir
 * tutar bu yolda tamamen yok sayılır.
 */
export async function islemEkle(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();

  const parsed = islemGirisSchema.safeParse(input);
  if (!parsed.success) {
    return basarisiz(parsed.error.issues[0]?.message ?? "Form geçersiz.");
  }
  const d = parsed.data;

  const supabase = await createClient();

  let tutar: number;
  let otomatikAciklama: string | null = null;

  if (d.tip === "harcama") {
    const { data: ogrenci, error: ogrenciHata } = await supabase
      .from("student_balances")
      .select("ad_soyad, efektif_gunluk_ucret")
      .eq("student_id", d.student_id)
      .maybeSingle();

    if (ogrenciHata) return basarisiz(hataMetni(ogrenciHata));
    if (!ogrenci) return basarisiz("Öğrenci bulunamadı.");

    const gunluk = Number(ogrenci.efektif_gunluk_ucret ?? 0);
    if (!(gunluk > 0)) {
      return basarisiz(
        "Bu öğrencinin günlük ücreti 0 görünüyor. Ayarlar sayfasından taban " +
          "günlük ücreti girin (veya öğrencinin iskontosunu kontrol edin).",
      );
    }

    tutar = Math.round(gunluk * d.gun_sayisi * 100) / 100;
    otomatikAciklama =
      d.gun_sayisi === 1 ? "1 gün yemek" : `${d.gun_sayisi} gün yemek`;
  } else {
    // tahsilat — tutar zorunlu, şema bunu garanti ediyor
    tutar = d.tutar as number;
  }

  const aciklama = d.aciklama?.trim() ? d.aciklama.trim() : otomatikAciklama;

  const { error } = await supabase.from("transactions").insert({
    student_id: d.student_id,
    tarih: d.tarih,
    tip: d.tip,
    tutar,
    aciklama,
    islemi_yapan_user_id: user.id,
  });

  if (error) return basarisiz(hataMetni(error));

  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath(`/students/${d.student_id}`);

  return basarili(
    d.tip === "tahsilat"
      ? `Tahsilat kaydedildi: ${tutar.toFixed(2)} ₺`
      : `Harcama kaydedildi: ${d.gun_sayisi} gün × günlük ücret = ${tutar.toFixed(2)} ₺`,
  );
}

/**
 * Var olan kaydı düzeltir. SADECE admin.
 * Personel denerse RLS zaten reddeder; burada da erken dönüyoruz.
 */
export async function islemGuncelle(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user.isAdmin) {
    return basarisiz(
      "Var olan kaydı yalnızca yönetici düzeltebilir. Lütfen yöneticinize başvurun.",
    );
  }

  const parsed = islemSchema.safeParse(input);
  if (!parsed.success) {
    return basarisiz(parsed.error.issues[0]?.message ?? "Form geçersiz.");
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update({
      tarih: d.tarih,
      tip: d.tip,
      tutar: d.tutar,
      aciklama: d.aciklama?.trim() ? d.aciklama.trim() : null,
    })
    .eq("id", id);

  if (error) return basarisiz(hataMetni(error));

  revalidatePath("/dashboard");
  revalidatePath(`/students/${d.student_id}`);
  return basarili("Kayıt güncellendi. Değişiklik işlem kayıtlarına düştü.");
}

/** Kaydı siler. SADECE admin. */
export async function islemSil(
  id: string,
  studentId: string,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user.isAdmin) {
    return basarisiz("Kayıt silme yetkiniz yok.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) return basarisiz(hataMetni(error));

  revalidatePath("/dashboard");
  revalidatePath(`/students/${studentId}`);
  return basarili("Kayıt silindi. Silme işlemi işlem kayıtlarına düştü.");
}

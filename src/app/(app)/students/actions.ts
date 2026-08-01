"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  basarili,
  basarisiz,
  hataMetni,
  type ActionResult,
} from "@/lib/action-result";
import { getSessionUser } from "@/lib/auth";
import { iskontoSchema, ogrenciSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

const bosaNull = (v?: string) => (v && v.trim() ? v.trim() : null);

/** Yeni öğrenci kaydı — admin ve personel yapabilir. */
export async function ogrenciEkle(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();

  const parsed = ogrenciSchema.safeParse(input);
  if (!parsed.success) {
    return basarisiz(parsed.error.issues[0]?.message ?? "Form geçersiz.");
  }
  const d = parsed.data;

  // İskonto ve devir tanımlamak admin yetkisi. Personelin gönderdiği
  // değerler sıfırlanır; RLS de aynı kuralı bağımsız olarak zorluyor.
  const iskontoOrani = user.isAdmin ? d.iskonto_orani : 0;
  const iskontoTutar = user.isAdmin ? d.iskonto_tutar : 0;
  const devir = user.isAdmin ? d.devir : 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .insert({
      ogrenci_no: d.ogrenci_no,
      ad_soyad: d.ad_soyad,
      sinif: bosaNull(d.sinif),
      kimlik_no: bosaNull(d.kimlik_no),
      veli_adi: bosaNull(d.veli_adi),
      veli_telefon: bosaNull(d.veli_telefon),
      iskonto_orani: iskontoOrani,
      iskonto_tutar: iskontoTutar,
      devir: devir,
      aktif: d.aktif,
      abone_tipi: d.abone_tipi,
    })
    .select("id")
    .single();

  if (error) return basarisiz(hataMetni(error));

  revalidatePath("/students");
  redirect(`/students/${data.id}`);
}

export async function ogrenciGuncelle(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user.isAdmin) return basarisiz("Öğrenci düzenleme yetkiniz yok.");

  const parsed = ogrenciSchema.safeParse(input);
  if (!parsed.success) {
    return basarisiz(parsed.error.issues[0]?.message ?? "Form geçersiz.");
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      ogrenci_no: d.ogrenci_no,
      ad_soyad: d.ad_soyad,
      sinif: bosaNull(d.sinif),
      kimlik_no: bosaNull(d.kimlik_no),
      veli_adi: bosaNull(d.veli_adi),
      veli_telefon: bosaNull(d.veli_telefon),
      iskonto_orani: d.iskonto_orani,
      iskonto_tutar: d.iskonto_tutar,
      devir: d.devir,
      aktif: d.aktif,
      abone_tipi: d.abone_tipi,
    })
    .eq("id", id);

  if (error) return basarisiz(hataMetni(error));

  revalidatePath(`/students/${id}`);
  revalidatePath("/students");
  return basarili("Öğrenci bilgileri güncellendi.");
}

/** Öğrenci detayındaki iskonto + devir düzenleme formu (sadece admin) */
export async function iskontoGuncelle(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user.isAdmin) return basarisiz("İskonto düzenleme yetkiniz yok.");

  const parsed = iskontoSchema.safeParse(input);
  if (!parsed.success) {
    return basarisiz(parsed.error.issues[0]?.message ?? "Form geçersiz.");
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({
      iskonto_orani: d.iskonto_orani,
      iskonto_tutar: d.iskonto_tutar,
      devir: d.devir,
    })
    .eq("id", d.student_id);

  if (error) return basarisiz(hataMetni(error));

  revalidatePath(`/students/${d.student_id}`);
  return basarili("İskonto ve devir güncellendi.");
}

/** students DELETE yalnızca admin — hem burada hem RLS'te. */
export async function ogrenciSil(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user.isAdmin) return basarisiz("Öğrenci silme yetkiniz yok.");

  const supabase = await createClient();
  const { error } = await supabase.from("students").delete().eq("id", id);

  if (error) return basarisiz(hataMetni(error));

  revalidatePath("/students");
  redirect("/students");
}

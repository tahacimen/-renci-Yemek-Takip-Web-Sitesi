"use server";

import { revalidatePath } from "next/cache";

import { hataMetni } from "@/lib/action-result";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  AboneTipi,
  AramaSonucuSatir,
  OgunKaydiSonucu,
  SerbestOgunSonucu,
  SerbestOgunTipi,
} from "@/lib/types";

export type AramaSonucu =
  | { ok: true; ogrenciler: AramaSonucuSatir[] }
  | { ok: false; hata: string };

/**
 * Ad, öğrenci no veya kimlik no içinde arar ve LİSTE döner.
 * Barkod okutulduğunda tam eşleşme tek sonuç olarak ilk sırada gelir.
 */
export async function ogrenciAra(terim: string): Promise<AramaSonucu> {
  await getSessionUser();

  const temiz = terim.trim();
  if (!temiz) return { ok: false, hata: "Arama için en az bir karakter girin." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ogrenci_ara", {
    p_terim: temiz,
    p_limit: 25,
  });

  if (error) return { ok: false, hata: hataMetni(error) };

  const ogrenciler = (data as AramaSonucuSatir[] | null) ?? [];
  if (ogrenciler.length === 0) {
    return { ok: false, hata: `"${temiz}" için kayıt bulunamadı.` };
  }

  return { ok: true, ogrenciler };
}

export type KayitSonucu =
  | { ok: true; sonuc: OgunKaydiSonucu }
  | { ok: false; hata: string };

/**
 * Yemek kaydeder. Tutar tamamen veritabanındaki ogun_kaydet() fonksiyonunda
 * hesaplanır — bu action'a tutar parametresi HİÇ gelmiyor.
 *   gunluk : öğrencinin iskontolu günlük ücreti düşülür
 *   aylik  : 0 ₺ devam kaydı (ücret taksit planından tahsil edilir)
 */
export async function ogunKaydet(
  studentId: string,
  aboneTipi: AboneTipi,
): Promise<KayitSonucu> {
  await getSessionUser();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ogun_kaydet", {
    p_student_id: studentId,
    p_ogun_tipi: aboneTipi,
  });

  if (error) {
    return { ok: false, hata: error.message ?? hataMetni(error) };
  }

  const sonuc = (data as OgunKaydiSonucu[] | null)?.[0];
  if (!sonuc) return { ok: false, hata: "Kayıt oluşturulamadı." };

  revalidatePath("/dashboard");
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);

  return { ok: true, sonuc };
}

export type SerbestSonuc =
  | { ok: true; sonuc: SerbestOgunSonucu }
  | { ok: false; hata: string };

/**
 * Öğrenciye bağlı OLMAYAN öğün kaydı — isim gerekmez.
 *   ucretli : günlük nakit ödeyen öğrenci (kasaya para girer)
 *   misafir : personel / ziyaretçi
 * Tutar veritabanındaki ayarlardan okunur.
 */
export async function serbestOgunKaydet(
  tip: SerbestOgunTipi,
): Promise<SerbestSonuc> {
  await getSessionUser();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("serbest_ogun_kaydet", {
    p_tip: tip,
  });

  if (error) return { ok: false, hata: error.message ?? hataMetni(error) };

  const sonuc = (data as SerbestOgunSonucu[] | null)?.[0];
  if (!sonuc) return { ok: false, hata: "Kayıt oluşturulamadı." };

  revalidatePath("/dashboard");
  return { ok: true, sonuc };
}

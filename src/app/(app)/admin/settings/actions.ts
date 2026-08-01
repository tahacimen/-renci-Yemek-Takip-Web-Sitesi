"use server";

import { revalidatePath } from "next/cache";

import {
  basarili,
  basarisiz,
  hataMetni,
  type ActionResult,
} from "@/lib/action-result";
import { getSessionUser } from "@/lib/auth";
import { ayarSchema, taksitSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export async function ayarGuncelle(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user.isAdmin) return basarisiz("Ayarları değiştirme yetkiniz yok.");

  const parsed = ayarSchema.safeParse(input);
  if (!parsed.success) {
    return basarisiz(parsed.error.issues[0]?.message ?? "Form geçersiz.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({
      taban_gunluk_ucret: parsed.data.taban_gunluk_ucret,
      ucretli_ogun_ucreti: parsed.data.ucretli_ogun_ucreti,
      misafir_ogun_ucreti: parsed.data.misafir_ogun_ucreti,
    })
    .eq("id", 1);

  if (error) return basarisiz(hataMetni(error));

  revalidatePath("/admin/settings");
  revalidatePath("/students");
  revalidatePath("/pos");
  return basarili("Ücretler güncellendi.");
}

/** Taksit planına satır ekler veya var olanı günceller. */
export async function taksitKaydet(input: unknown): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user.isAdmin) return basarisiz("Ayarları değiştirme yetkiniz yok.");

  const parsed = taksitSchema.safeParse(input);
  if (!parsed.success) {
    return basarisiz(parsed.error.issues[0]?.message ?? "Form geçersiz.");
  }
  const d = parsed.data;

  const supabase = await createClient();
  const govde = {
    yil: d.yil,
    ad: d.ad,
    vade_tarihi: d.vade_tarihi,
    tutar: d.tutar,
  };

  const { error } = d.id
    ? await supabase.from("taksit_plani").update(govde).eq("id", d.id)
    : await supabase.from("taksit_plani").insert(govde);

  if (error) {
    if (error.code === "23505") {
      return basarisiz("Bu yıl için aynı adda bir taksit zaten var.");
    }
    return basarisiz(hataMetni(error));
  }

  revalidatePath("/admin/settings");
  revalidatePath("/reports/taksit");
  return basarili(d.id ? "Taksit güncellendi." : "Taksit eklendi.");
}

export async function taksitSil(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user.isAdmin) return basarisiz("Ayarları değiştirme yetkiniz yok.");

  const supabase = await createClient();
  const { error } = await supabase.from("taksit_plani").delete().eq("id", id);
  if (error) return basarisiz(hataMetni(error));

  revalidatePath("/admin/settings");
  revalidatePath("/reports/taksit");
  return basarili("Taksit silindi.");
}

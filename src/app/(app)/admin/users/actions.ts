"use server";

import { revalidatePath } from "next/cache";

import {
  basarili,
  basarisiz,
  hataMetni,
  type ActionResult,
} from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth";
import { kullaniciSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRol } from "@/lib/types";

/**
 * Yeni kullanıcı oluşturur.
 * Auth Admin API service_role gerektirir; bu yüzden önce çağıranın
 * admin olduğu doğrulanır, sonra service role istemcisi kullanılır.
 */
export async function kullaniciEkle(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = kullaniciSchema.safeParse(input);
  if (!parsed.success) {
    return basarisiz(parsed.error.issues[0]?.message ?? "Form geçersiz.");
  }
  const d = parsed.data;

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return basarisiz((e as Error).message);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: d.email,
    password: d.sifre,
    email_confirm: true,
    user_metadata: { ad_soyad: d.ad_soyad, rol: d.rol },
  });

  if (error) {
    return basarisiz(
      error.message.includes("already been registered")
        ? "Bu e-posta ile kayıtlı bir kullanıcı zaten var."
        : error.message,
    );
  }

  // handle_new_user trigger'ı profili açar; rol ve adı garantiye alalım.
  if (data.user) {
    const { error: profilHata } = await admin
      .from("profiles")
      .upsert({ id: data.user.id, ad_soyad: d.ad_soyad, rol: d.rol });
    if (profilHata) return basarisiz(hataMetni(profilHata));
  }

  revalidatePath("/admin/users");
  return basarili(`${d.email} kullanıcısı oluşturuldu.`);
}

/** Rol atama — profiles UPDATE RLS'i zaten admin ile sınırlı. */
export async function rolGuncelle(
  userId: string,
  rol: UserRol,
): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.id && rol !== "admin") {
    return basarisiz(
      "Kendi yönetici yetkinizi kaldıramazsınız. Başka bir admin bunu yapabilir.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ rol })
    .eq("id", userId);

  if (error) return basarisiz(hataMetni(error));

  revalidatePath("/admin/users");
  return basarili("Rol güncellendi.");
}

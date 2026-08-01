"use server";

import { redirect } from "next/navigation";

import { basarisiz, type ActionResult } from "@/lib/action-result";
import { girisSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export async function girisYap(
  input: unknown,
  next?: string,
): Promise<ActionResult> {
  const parsed = girisSchema.safeParse(input);
  if (!parsed.success) {
    return basarisiz("Form bilgileri geçersiz.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.sifre,
  });

  if (error) {
    return basarisiz(
      error.message === "Invalid login credentials"
        ? "E-posta veya şifre hatalı."
        : error.message,
    );
  }

  // Açık yönlendirmeyi (open redirect) engellemek için sadece site içi yollar
  const hedef = next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
  redirect(hedef);
}

export async function cikisYap() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

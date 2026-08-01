import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Card, LinkButton, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/types";

import { StudentForm } from "../../student-form";

export const metadata: Metadata = { title: "Öğrenci Düzenle" };

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const supabase = await createClient();
  const [{ data: ogrenci }, { data: ayar }] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("app_settings")
      .select("taban_gunluk_ucret")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (!ogrenci) notFound();

  return (
    <>
      <PageHeader
        title="Öğrenci Bilgilerini Düzenle"
        description={(ogrenci as Student).ad_soyad}
        actions={
          <LinkButton href={`/students/${id}`}>← Detaya dön</LinkButton>
        }
      />
      <Card>
        <StudentForm
          ogrenci={ogrenci as Student}
          tabanUcret={Number(ayar?.taban_gunluk_ucret ?? 0)}
          isAdmin
        />
      </Card>
    </>
  );
}

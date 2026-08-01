import type { Metadata } from "next";

import { Alert, Card, PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { StudentForm } from "../student-form";

export const metadata: Metadata = { title: "Yeni Öğrenci" };

export default async function NewStudentPage() {
  const user = await getSessionUser();

  const supabase = await createClient();
  const { data: ayar } = await supabase
    .from("app_settings")
    .select("taban_gunluk_ucret")
    .eq("id", 1)
    .maybeSingle();

  return (
    <>
      <PageHeader
        title="Yeni Öğrenci"
        description="Zorunlu alanlar * ile işaretlidir."
      />

      {!user.isAdmin && (
        <div className="mb-4">
          <Alert ton="blue">
            İskonto ve devir tanımlamak yönetici yetkisindedir; bu öğrenci
            iskontosuz ve devirsiz kaydedilir. Gerekiyorsa yöneticiniz sonradan
            tanımlayabilir.
          </Alert>
        </div>
      )}

      <Card>
        <StudentForm
          tabanUcret={Number(ayar?.taban_gunluk_ucret ?? 0)}
          isAdmin={user.isAdmin}
        />
      </Card>
    </>
  );
}

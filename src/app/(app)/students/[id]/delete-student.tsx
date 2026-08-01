"use client";

import { useState, useTransition } from "react";

import { Alert, Button } from "@/components/ui";

import { ogrenciSil } from "../actions";

export function DeleteStudentButton({
  studentId,
  adSoyad,
}: {
  studentId: string;
  adSoyad: string;
}) {
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      {hata && (
        <div className="mb-2">
          <Alert>{hata}</Alert>
        </div>
      )}
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          const cevap = window.prompt(
            `"${adSoyad}" adlı öğrenci ve TÜM işlem geçmişi kalıcı olarak silinecek.\nOnaylamak için öğrencinin adını yazın:`,
          );
          if (cevap?.trim() !== adSoyad.trim()) {
            if (cevap !== null) setHata("Ad eşleşmedi, silme iptal edildi.");
            return;
          }
          setHata(null);
          startTransition(async () => {
            const sonuc = await ogrenciSil(studentId);
            if (sonuc && !sonuc.ok) setHata(sonuc.hata);
          });
        }}
      >
        {pending ? "Siliniyor…" : "Öğrenciyi sil"}
      </Button>
    </div>
  );
}

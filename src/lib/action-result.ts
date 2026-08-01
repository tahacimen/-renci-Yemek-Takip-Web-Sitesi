export type ActionResult =
  | { ok: true; mesaj?: string }
  | { ok: false; hata: string };

export const basarili = (mesaj?: string): ActionResult => ({ ok: true, mesaj });
export const basarisiz = (hata: string): ActionResult => ({ ok: false, hata });

/** Postgres / PostgREST hatalarını kullanıcıya gösterilebilir metne çevirir. */
export function hataMetni(error: {
  code?: string;
  message?: string;
} | null): string {
  if (!error) return "Bilinmeyen bir hata oluştu.";

  switch (error.code) {
    case "23505":
      return "Bu öğrenci numarası zaten kayıtlı.";
    case "23503":
      return "İlişkili kayıt bulunamadı.";
    case "23514":
      return "Girilen değerler geçerli aralıkta değil.";
    case "42501":
    case "PGRST301":
      return "Bu işlem için yetkiniz yok.";
  }

  // RLS reddi genelde 0 satır etkilenmesi ya da policy hatası olarak döner
  if (error.message?.toLowerCase().includes("row-level security")) {
    return "Bu işlem için yetkiniz yok.";
  }

  return error.message ?? "İşlem tamamlanamadı.";
}

import { z } from "zod";

/** Türkçe ondalık ayracını (virgül) kabul eden sayı dönüştürücü */
const paraSayisi = (mesaj = "Geçerli bir tutar girin") =>
  z
    .union([z.string(), z.number()])
    .transform((v) =>
      typeof v === "number" ? v : Number(String(v).replace(",", ".").trim()),
    )
    .refine((v) => Number.isFinite(v), { message: mesaj });

/**
 * HTML <select> her zaman string döndürür ("true" / "false"), ama
 * defaultValues'tan gelen değer boolean olabilir. İkisini de kabul edip
 * boolean'a çeviriyoruz — aksi halde "Aktif" seçiliyken kayıt pasif gidiyordu.
 */
const boolAlan = (varsayilan: boolean) =>
  z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .transform((v) => (typeof v === "boolean" ? v : v === "true"))
    .default(varsayilan);

export const girisSchema = z.object({
  email: z.email("Geçersiz e-posta"),
  sifre: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});
export type GirisInput = z.infer<typeof girisSchema>;

export const ogrenciSchema = z.object({
  ogrenci_no: z.string().trim().min(1, "Öğrenci no zorunlu").max(50),
  ad_soyad: z.string().trim().min(2, "Ad soyad zorunlu").max(150),
  sinif: z.string().trim().max(50).optional().or(z.literal("")),
  kimlik_no: z.string().trim().max(20).optional().or(z.literal("")),
  veli_adi: z.string().trim().max(150).optional().or(z.literal("")),
  veli_telefon: z.string().trim().max(30).optional().or(z.literal("")),
  iskonto_orani: paraSayisi("Geçerli bir oran girin")
    .refine((v) => v >= 0 && v <= 100, "Oran 0-100 arasında olmalı")
    .default(0),
  iskonto_tutar: paraSayisi()
    .refine((v) => v >= 0, "İskonto tutarı negatif olamaz")
    .default(0),
  devir: paraSayisi().default(0),
  aktif: boolAlan(true),
  abone_tipi: z.enum(["gunluk", "aylik"]).default("gunluk"),
});
export type OgrenciInput = z.input<typeof ogrenciSchema>;
export type OgrenciOutput = z.output<typeof ogrenciSchema>;

export const iskontoSchema = z.object({
  // guid: 8-4-4-4-12 hex biçimini doğrular, RFC sürüm/varyant bitlerini
  // zorunlu kılmaz (eski sistemden aktarılan kimliklerle uyum için).
  student_id: z.guid(),
  iskonto_orani: paraSayisi("Geçerli bir oran girin").refine(
    (v) => v >= 0 && v <= 100,
    "Oran 0-100 arasında olmalı",
  ),
  iskonto_tutar: paraSayisi().refine(
    (v) => v >= 0,
    "İskonto tutarı negatif olamaz",
  ),
  devir: paraSayisi(),
});
export type IskontoInput = z.input<typeof iskontoSchema>;

/**
 * Var olan bir kaydı düzeltirken kullanılır (yönetici düzeltme formu).
 * Burada tutar her zaman elle girilir — yanlış kaydı düzeltmek serbest olmalı.
 */
export const islemSchema = z.object({
  student_id: z.guid("Öğrenci seçin"),
  tip: z.enum(["tahsilat", "harcama"], { message: "İşlem tipi seçin" }),
  tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih seçin"),
  tutar: paraSayisi().refine((v) => v > 0, "Tutar 0'dan büyük olmalı"),
  aciklama: z.string().trim().max(500).optional().or(z.literal("")),
});
export type IslemInput = z.input<typeof islemSchema>;

/**
 * Yeni işlem girişi (/payments/new).
 *
 * harcama : tutar GÖNDERİLMEZ. Sunucu, öğrencinin iskontolu günlük ücretini
 *           veritabanından okuyup gun_sayisi ile çarpar. Böylece tutar
 *           istemciden manipüle edilemez.
 * tahsilat: tutar zorunlu — veli ne ödediyse o.
 */
export const islemGirisSchema = z
  .object({
    student_id: z.guid("Öğrenci seçin"),
    tip: z.enum(["tahsilat", "harcama"], { message: "İşlem tipi seçin" }),
    tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih seçin"),
    tutar: paraSayisi().optional(),
    gun_sayisi: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === "number" ? v : Number(String(v).trim())))
      .refine((v) => Number.isInteger(v) && v >= 1 && v <= 31, {
        message: "Gün sayısı 1-31 arasında olmalı",
      })
      .default(1),
    aciklama: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine(
    (d) => d.tip !== "tahsilat" || (d.tutar !== undefined && d.tutar > 0),
    { message: "Tutar 0'dan büyük olmalı", path: ["tutar"] },
  );
export type IslemGirisInput = z.input<typeof islemGirisSchema>;

export const kullaniciSchema = z.object({
  email: z.email("Geçersiz e-posta"),
  sifre: z.string().min(8, "Şifre en az 8 karakter olmalı"),
  ad_soyad: z.string().trim().min(2, "Ad soyad zorunlu").max(150),
  rol: z.enum(["admin", "personel"]),
});
export type KullaniciInput = z.infer<typeof kullaniciSchema>;

export const taksitSchema = z.object({
  id: z.guid().optional(),
  yil: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === "number" ? v : Number(String(v).trim())))
    .refine((v) => Number.isInteger(v) && v >= 2000 && v <= 2100, {
      message: "Geçerli bir yıl girin",
    }),
  ad: z.string().trim().min(1, "Taksit adı zorunlu").max(60),
  vade_tarihi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vade tarihi seçin"),
  tutar: paraSayisi().refine((v) => v > 0, "Tutar 0'dan büyük olmalı"),
});
export type TaksitInput = z.input<typeof taksitSchema>;

export const ayarSchema = z.object({
  taban_gunluk_ucret: paraSayisi().refine(
    (v) => v >= 0,
    "Ücret negatif olamaz",
  ),
  ucretli_ogun_ucreti: paraSayisi()
    .refine((v) => v >= 0, "Ücret negatif olamaz")
    .default(0),
  misafir_ogun_ucreti: paraSayisi()
    .refine((v) => v >= 0, "Ücret negatif olamaz")
    .default(0),
});
export type AyarInput = z.input<typeof ayarSchema>;

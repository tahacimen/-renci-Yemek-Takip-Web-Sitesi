/**
 * Form şemalarının çalışma zamanı davranışı — özellikle Türkçe ondalık
 * ayracı (virgül) ve iskonto/devir sınırları.
 * Çalıştırmak için: npm run test:schemas
 */
import {
  islemSchema,
  islemGirisSchema,
  ogrenciSchema,
  ayarSchema,
} from "../src/lib/schemas.ts";

let hata = 0;
function kontrol(ad: string, kosul: boolean, detay?: unknown) {
  if (!kosul) {
    hata++;
    console.log("BASARISIZ:", ad, JSON.stringify(detay));
  } else {
    console.log("ok:", ad);
  }
}

// Postgres gen_random_uuid() çıktısı (v4) ve eski sistemden gelebilecek
// standart dışı bir kimlik — ikisi de kabul edilmeli.
const V4 = "3f2b1c4e-8a7d-4b6f-9c2e-1d5a7b3e9f01";
const ESKI = "11111111-1111-1111-1111-111111111111";

// 1) Virgüllü tutar kabul edilmeli
const a = islemSchema.safeParse({
  student_id: V4,
  tip: "tahsilat",
  tarih: "2026-07-24",
  tutar: "1.234,50".replace(".", ""),
  aciklama: "",
});
kontrol("virgullu tutar", a.success && a.data.tutar === 1234.5, a.error?.issues ?? a.data);

// 2) Noktalı tutar
const b = islemSchema.safeParse({
  student_id: ESKI,
  tip: "harcama",
  tarih: "2026-07-24",
  tutar: "75.00",
});
kontrol("noktali tutar", b.success && b.data.tutar === 75, b.error?.issues);

// 3) Sıfır/negatif tutar reddedilmeli
const c = islemSchema.safeParse({
  student_id: ESKI,
  tip: "tahsilat",
  tarih: "2026-07-24",
  tutar: "0",
});
kontrol("sifir tutar reddedilir", !c.success);

// 4) Geçersiz öğrenci id
const d = islemSchema.safeParse({
  student_id: "",
  tip: "tahsilat",
  tarih: "2026-07-24",
  tutar: "10",
});
kontrol("bos ogrenci reddedilir", !d.success);

// 5) Öğrenci formu varsayılanları (boş iskonto alanları)
const e = ogrenciSchema.safeParse({
  ogrenci_no: "1001",
  ad_soyad: "Ayşe Yılmaz",
});
kontrol(
  "ogrenci varsayilanlari",
  e.success &&
    e.data.iskonto_orani === 0 &&
    e.data.iskonto_tutar === 0 &&
    e.data.devir === 0 &&
    e.data.aktif === true,
  e.error?.issues ?? e.data,
);

// 6) Negatif devir kabul edilmeli (borç devri)
const f = ogrenciSchema.safeParse({
  ogrenci_no: "1002",
  ad_soyad: "Berk Demir",
  devir: "-120,50",
});
kontrol("negatif devir", f.success && f.data.devir === -120.5, f.error?.issues);

// 7) %100 üzeri iskonto reddedilmeli
const g = ogrenciSchema.safeParse({
  ogrenci_no: "1003",
  ad_soyad: "Ceren Aksoy",
  iskonto_orani: "150",
});
kontrol("gecersiz iskonto orani reddedilir", !g.success);

// 8) Ayar formu
const h = ayarSchema.safeParse({ taban_gunluk_ucret: "75,5" });
kontrol("ayar virgullu", h.success && h.data.taban_gunluk_ucret === 75.5, h.error?.issues);

// 9) Metin tutar reddedilmeli
const i = islemSchema.safeParse({
  student_id: ESKI,
  tip: "tahsilat",
  tarih: "2026-07-24",
  tutar: "abc",
});
kontrol("metin tutar reddedilir", !i.success);

// 10) aktif alanı: <select> string döndürür ("true"/"false")
const j = ogrenciSchema.safeParse({
  ogrenci_no: "2001",
  ad_soyad: "Select String",
  aktif: "true",
});
kontrol("aktif: string 'true' -> true", j.success && j.data.aktif === true, j.error?.issues ?? j.data);

const k = ogrenciSchema.safeParse({
  ogrenci_no: "2002",
  ad_soyad: "Select String",
  aktif: "false",
});
kontrol("aktif: string 'false' -> false", k.success && k.data.aktif === false, k.error?.issues ?? k.data);

// 11) defaultValues'tan boolean gelirse de bozulmamalı
const l = ogrenciSchema.safeParse({
  ogrenci_no: "2003",
  ad_soyad: "Boolean Default",
  aktif: true,
});
kontrol("aktif: boolean true korunur", l.success && l.data.aktif === true, l.error?.issues ?? l.data);

const m = ogrenciSchema.safeParse({
  ogrenci_no: "2004",
  ad_soyad: "Boolean Default",
  aktif: false,
});
kontrol("aktif: boolean false korunur", m.success && m.data.aktif === false, m.error?.issues ?? m.data);

// 12) Hiç gönderilmezse varsayılan aktif olmalı
const n = ogrenciSchema.safeParse({ ogrenci_no: "2005", ad_soyad: "Varsayilan" });
kontrol("aktif: varsayilan true", n.success && n.data.aktif === true, n.error?.issues ?? n.data);

// ---- Yeni işlem girişi (tutar alanı kaldırıldı) ----

// 13) harcama: tutar gönderilmese bile geçerli olmalı
const h1 = islemGirisSchema.safeParse({
  student_id: V4,
  tip: "harcama",
  tarih: "2026-07-24",
  gun_sayisi: 5,
});
kontrol(
  "harcama: tutarsiz gecerli, gun=5",
  h1.success && h1.data.gun_sayisi === 5 && h1.data.tutar === undefined,
  h1.error?.issues ?? h1.data,
);

// 14) harcama: gün sayısı varsayılanı 1
const h2 = islemGirisSchema.safeParse({
  student_id: V4,
  tip: "harcama",
  tarih: "2026-07-24",
});
kontrol("harcama: gun varsayilani 1", h2.success && h2.data.gun_sayisi === 1, h2.error?.issues);

// 15) harcama: geçersiz gün sayısı reddedilmeli
const h3 = islemGirisSchema.safeParse({
  student_id: V4,
  tip: "harcama",
  tarih: "2026-07-24",
  gun_sayisi: 0,
});
kontrol("harcama: 0 gun reddedilir", !h3.success);

const h4 = islemGirisSchema.safeParse({
  student_id: V4,
  tip: "harcama",
  tarih: "2026-07-24",
  gun_sayisi: "2,5",
});
kontrol("harcama: ondalikli gun reddedilir", !h4.success);

// 16) tahsilat: tutar hala ZORUNLU olmalı
const t1 = islemGirisSchema.safeParse({
  student_id: V4,
  tip: "tahsilat",
  tarih: "2026-07-24",
});
kontrol("tahsilat: tutarsiz reddedilir", !t1.success);

const t2 = islemGirisSchema.safeParse({
  student_id: V4,
  tip: "tahsilat",
  tarih: "2026-07-24",
  tutar: "1250,75",
});
kontrol("tahsilat: virgullu tutar", t2.success && t2.data.tutar === 1250.75, t2.error?.issues);

console.log(hata === 0 ? "\nTUM TESTLER GECTI" : `\n${hata} TEST BASARISIZ`);
process.exit(hata === 0 ? 0 : 1);

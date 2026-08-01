# Proje Devir Dosyası (HANDOFF)

> Bu dosya, projeyi devralan kişi (ya da başka bir Claude oturumu) için
> hazırlanmıştır. Amaç: kodu açıp "neredeyiz, nasıl devam edilir" sorusunu
> tek dosyadan cevaplamak. Ayrıntılı kullanım için `README.md`'ye bakın.

Son güncelleme: 2026-08-01

---

## 1. Proje nedir

Yemek dağıtım firması için **öğrenci yemek + ödeme takip sistemi**. Eski
masaüstü programın yerini alan, çok kullanıcılı web uygulaması. Yemekhane
kapısında hızlı giriş (POS ekranı), öğrenci cari hesapları, aylıkçı taksit
takibi ve gün sonu / nakit / devam raporları içerir.

**Teknoloji:** Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS 4
· Supabase (Auth + Postgres + RLS) · react-hook-form + zod.

---

## 2. Bağlı servisler

| Servis | Değer |
|--------|-------|
| GitHub | `github.com/tahacimen/-renci-Yemek-Takip-Web-Sitesi` |
| Supabase proje adı | `ogrenci-yemek-takip` |
| Supabase proje ref | `zewgfzydcijorexiqblu` |
| Supabase bölge | eu-central-1 |
| Supabase URL | `https://zewgfzydcijorexiqblu.supabase.co` |

`.env.local` içinde URL + anon anahtarı **dolu**. Eksik olan tek şey
`SUPABASE_SERVICE_ROLE_KEY` — Dashboard → Project Settings → API Keys →
`service_role`'dan alınıp eklenmeli (kullanıcı ekleme/listeleme için).

> `.env.local` git'e **gönderilmez** (`.gitignore`'da). Devralan kişi kendi
> `.env.local`'ini `.env.example`'a bakarak oluşturmalı. Anon anahtarı
> Dashboard → Project Settings → API'den alınır.

---

## 3. Nasıl çalıştırılır

```bash
npm install
npm run dev          # http://localhost:3000
```

Doğrulama komutları:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (0 hata beklenir)
npm run test:schemas # zod form şemaları
npm run build        # üretim derlemesi
```

---

## 4. Veritabanı — migration'lar

`supabase/migrations/` altında **sırayla** uygulanır. Yeni bir Supabase
projesine kurulum: SQL Editor'de 0001'den 0014'e kadar tek tek çalıştırın.
**Bu proje için hepsi zaten uygulanmış durumda.**

| # | Dosya | İçerik |
|---|-------|--------|
| 0001 | init | Tablolar, enum'lar, trigger'lar (audit + updated_at + yeni kullanıcı) |
| 0002 | rls | Row Level Security politikaları |
| 0003 | views_functions | `student_balances` view'i, rapor fonksiyonları |
| 0004 | harden_function_privileges | Güvenlik advisor bulguları |
| 0005 | rls_initplan_and_fk_indexes | Performans advisor bulguları |
| 0006 | students_insert_personel | (0007 tarafından geçersiz kılındı) |
| 0007 | rol_ayrimi_kaldirildi | **Rol ayrımı kaldırıldı: admin = personel** |
| 0008 | ogun_tipleri_ve_pos | (0010 tarafından yeniden düzenlendi) |
| 0009 | ogun_kaydet_ve_arama | (0011 tarafından güncellendi) |
| 0010 | abone_tipi_ve_taksit | Abone tipi (günlükçü/aylıkçı), taksit planı |
| 0011 | ogun_kaydet_v2_ve_raporlar | Abone tipine göre fiyatlama, gün sonu + devam |
| 0012 | rapor_taksit_ve_tahsilat | Tahsilat geçmişi ve taksit takibi raporları |
| 0013 | taksit_gec_odeme_ve_arama | Geç ödeme düzeltmesi, harfe göre arama, yıllık devam |
| 0014 | serbest_ogunler_ve_mukerrer_engeli | Ücretli/Misafir öğün, aynı gün mükerrer engeli |

### Tablolar

- **students** — öğrenci kartı. `abone_tipi` (gunluk/aylik), `iskonto_orani`,
  `iskonto_tutar`, `devir`, `aktif`.
- **transactions** — cari hareketler. `tip` (tahsilat/harcama),
  `ogun_abone_tipi` (yemekhaneden gelenlerde dolu).
- **serbest_ogunler** — öğrenciye bağlı OLMAYAN öğünler (ucretli/misafir).
- **taksit_plani** — aylıkçıların yıllık ücret takvimi (yıl, vade, tutar).
- **app_settings** — tek satır: `taban_gunluk_ucret`, `ucretli_ogun_ucreti`,
  `misafir_ogun_ucreti`.
- **profiles** — auth.users'a rol + ad. **audit_log** — otomatik değişiklik izi.

### Kritik kurallar (veritabanı seviyesinde)

1. **Bakiye hesaplanır, saklanmaz.** `student_balances` view'i:
   `kalan = devir + Σtahsilat − Σharcama`.
2. **Fiyat istemciden gelmez.** `ogun_kaydet()` ve `serbest_ogun_kaydet()`
   Postgres fonksiyonları tutarı kendileri hesaplar.
3. **Aynı gün aynı öğrenciye ikinci yemek kaydı yasak** (`ogun_kaydet` hata verir).
4. **Aylıkçı yemek = 0 ₺** (ücret taksitten tahsil edilir); günlükçü = iskontolu ücret.
5. **audit_log'a uygulamadan yazılamaz** — yalnızca SECURITY DEFINER trigger.
6. **Rol ayrımı şu an KAPALI** — admin ve personel aynı yetkilere sahip.
   Geri açmak için `src/lib/auth.ts` → `ROL_AYRIMI_AKTIF = true` + 0002/0005
   politikaları yeniden uygulanır (README'de anlatıldı).

### RPC fonksiyonları (rapor/işlem)

`ogun_kaydet`, `serbest_ogun_kaydet`, `ogrenci_ara`, `ogrenci_bul`,
`rapor_gun_sonu`, `rapor_nakit`, `rapor_devam`, `rapor_devam_yil`,
`rapor_tahsilatlar`, `rapor_taksit`, `rapor_detay`, `dashboard_ozet`,
`sinif_listesi`, `hesapla_efektif_ucret`, `is_admin`, `current_rol`.

---

## 5. Sayfalar

| Yol | Ne yapar |
|-----|----------|
| `/login` | Supabase Auth girişi |
| `/pos` | **Yemekhane girişi** — harfe göre arama, kredi göstergesi, Günlükçü/Aylıkçı/Ücretli/Misafir butonları |
| `/dashboard` | Genel özet kartları |
| `/students` | Öğrenci listesi (arama, sınıf, borç, abone tipi rengi) |
| `/students/new`, `/students/[id]`, `/students/[id]/edit` | Öğrenci ekle/detay/düzenle |
| `/payments/new` | Elle tahsilat / harcama girişi (yönetici düzeltmesi) |
| `/reports` | Cari durum + CSV export |
| `/reports/gun-sonu` | Gün gün kaç kişi yedi (günlükçü/aylıkçı/ücretli/misafir) |
| `/reports/nakit` | Gün gün kasaya giren nakit |
| `/reports/devam` + `/reports/devam/[id]` | Aylık devam çizelgesi + öğrenci bazlı yıllık takvim |
| `/reports/tahsilat` | Öğrenci bazlı para girişi geçmişi |
| `/reports/taksit` | Aylıkçı taksit takibi, geciken ödemeler |
| `/admin/users` | Kullanıcı yönetimi (service_role gerekir) |
| `/admin/audit-log` | Değişiklik geçmişi |
| `/admin/settings` | Ücretler + taksit planı |

### Kod düzeni

- Veri çekme **server component**'lerde (`page.tsx`), mutasyonlar
  **server action**'larda (`actions.ts`, `src/lib/*-actions.ts`).
- Ortak UI: `src/components/ui.tsx`. Form şemaları: `src/lib/schemas.ts`.
- Supabase istemcileri: `src/lib/supabase/` (server / client / admin / middleware).
- Oturum yenileme: `src/proxy.ts` (Next 16'da `middleware` yerine `proxy`).
- Tipler: `src/lib/types.ts` (elle tutuluyor; şema değişince güncellenmeli).

---

## 6. Kurulumdan sonra yapılacaklar

1. **Ayarlar → taban günlük ücret** gir (0 ise günlükçü/ücretli çalışmaz).
2. **Ayarlar → Misafir/Ücretli fiyatı** kontrol et.
3. **Ayarlar → taksit planı**: aylıkçılar için vade + tutar gir.
4. **İlk admin**: Supabase Studio → Auth → Users'tan kullanıcı aç, sonra
   `profiles.rol = 'admin'` yap (README'de SQL var). Sonrakiler /admin/users'tan.
5. `SUPABASE_SERVICE_ROLE_KEY`'i `.env.local`'e ekle.

---

## 7. Test yaklaşımı

DB mantığı canlı veritabanında geçici test fonksiyonlarıyla doğrulandı
(RLS senaryoları, bakiye/rapor matematiği, taksit kümülatif hesabı, mükerrer
engeli). Test fonksiyonları `__` önekliydi ve çalıştıktan sonra silindi —
kalıcı test dosyası yok. Form şemaları için `scripts/schema-test.mts` var
(`npm run test:schemas`).

---

## 8. Bilinen açık işler / dikkat

- Devam çizelgesinde "gelmeyen gün" **hafta içi** günler üzerinden hesaplanır;
  resmî tatil takvimi yok (istenirse eklenebilir).
- Supabase advisor "RLS policy always true" uyarıları verir — bu, rol ayrımının
  kapatılmasının bilinçli sonucudur, hata değil.
- Supabase'de "leaked password protection" kapalı (Dashboard'dan açılabilir).
- CSV export sadece `/reports` (cari durum) için var; diğer raporlarda yok.

# Öğrenci Yemek Takip Web Sitesi

Yemek dağıtım firması için öğrenci yemek ve ödeme (cari hesap) takip sistemi.
Eski masaüstü programın yerini alan, çok kullanıcılı web uygulaması.

**Teknolojiler:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 ·
Supabase (Auth + Postgres + RLS) · react-hook-form + zod

---

## Kurulum

### 1. Supabase projesi

> **Bu repo için proje zaten kurulu:** `ogrenci-yemek-takip`
> (ref `zewgfzydcijorexiqblu`, eu-central-1). Dört migration da uygulandı ve
> `.env.local` hazır. Sıfırdan kuracaksanız aşağıdaki adımları izleyin.

**SQL Editor**'de migration dosyalarını **sırasıyla** çalıştırın:

| Sıra | Dosya | İçerik |
|------|-------|--------|
| 1 | `supabase/migrations/0001_init.sql` | Tablolar, enum'lar, trigger'lar (audit + updated_at + yeni kullanıcı) |
| 2 | `supabase/migrations/0002_rls.sql` | Row Level Security politikaları |
| 3 | `supabase/migrations/0003_views_functions.sql` | `student_balances` view'i, rapor fonksiyonları |
| 4 | `supabase/migrations/0004_harden_function_privileges.sql` | Güvenlik advisor bulguları (fonksiyon yetkileri, search_path) |
| 5 | `supabase/migrations/0005_rls_initplan_and_fk_indexes.sql` | Performans advisor bulguları (RLS initplan, FK indeksleri) |
| 6 | `supabase/migrations/0006_students_insert_personel.sql` | Ara adım — 0007 tarafından geçersiz kılındı |
| 7 | `supabase/migrations/0007_rol_ayrimi_kaldirildi.sql` | Rol ayrımı kaldırıldı: admin = personel |
| 8 | `supabase/migrations/0008_ogun_tipleri_ve_pos.sql` | Öğün tipleri tablosu, `transactions.ogun_tipi_id` |
| 9 | `supabase/migrations/0009_ogun_kaydet_ve_arama.sql` | `ogun_kaydet()` ve `ogrenci_bul()` RPC'leri |
| 10 | `supabase/migrations/0010_abone_tipi_ve_taksit.sql` | Abone tipi (günlükçü/aylıkçı), taksit planı tablosu |
| 11 | `supabase/migrations/0011_ogun_kaydet_v2_ve_raporlar.sql` | Abone tipine göre fiyatlama, gün sonu + devam raporları |
| 12 | `supabase/migrations/0012_rapor_taksit_ve_tahsilat.sql` | Tahsilat geçmişi ve taksit takibi raporları |

Supabase CLI kullanıyorsanız:

```bash
supabase link --project-ref <proje-ref>
supabase db push
```

### 2. Ortam değişkenleri

`.env.local` dosyası URL ve anon anahtarıyla hazır. **Eksik olan tek şey
`SUPABASE_SERVICE_ROLE_KEY`** — Dashboard → Project Settings → API Keys →
`service_role` bölümünden kopyalayıp `.env.local` içine yapıştırın.
Bu anahtar olmadan `/admin/users` sayfasından kullanıcı eklenemez
(uygulamanın geri kalanı çalışır).

Sıfırdan kuruyorsanız:

```bash
cp .env.example .env.local
```

| Değişken | Nereden alınır | Not |
|----------|----------------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API | Tarayıcıya gider, RLS korur |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API | **Sadece sunucu.** Kullanıcı ekleme/listeleme için. Repoya commit'lemeyin |

### 3. İlk admin kullanıcısı

Supabase Studio → **Authentication → Users → Add user** ile bir kullanıcı
oluşturun (e-posta + şifre). Sonra SQL Editor'de:

```sql
update public.profiles
set rol = 'admin', ad_soyad = 'Sistem Yöneticisi'
where id = (select id from auth.users where email = 'admin@firma.com');
```

Bundan sonraki kullanıcılar uygulama içindeki **/admin/users** sayfasından
eklenebilir.

### 4. Taban günlük ücret

Uygulamada **Ayarlar** sayfasından (veya `supabase/seed.sql` içindeki
`update` ile) günlük yemek ücretini girin. İskonto hesapları bu değere göre
yapılır.

### 5. Çalıştırma

```bash
npm install
npm run dev
```

### Doğrulama komutları

```bash
npm run typecheck     # TypeScript
npm run lint          # ESLint
npm run test:schemas  # Form şemaları (virgüllü tutar, iskonto sınırları vb.)
npm run build         # Üretim derlemesi
```

---

## Roller ve yetkiler

> **Şu anki durum: rol ayrımı KAPALI.** `admin` ve `personel` aynı yetkilere
> sahip — her ikisi de öğrenci ekleyebilir, düzenleyebilir, silebilir; işlem
> girebilir, düzeltebilir, silebilir; ayarları ve kullanıcıları yönetebilir.
> (`0007_rol_ayrimi_kaldirildi.sql`)

Giriş yapmış her kullanıcı için geçerli:

| İşlem | Durum |
|-------|:-----:|
| Öğrenci arama / görüntüleme | ✅ |
| Öğrenci ekleme / düzenleme / silme | ✅ |
| İskonto & devir tanımlama | ✅ |
| Tahsilat / harcama girme, düzeltme, silme | ✅ |
| Kullanıcı yönetimi, ayarlar | ✅ |
| İşlem kayıtlarını (audit log) görme | ✅ |

**Rol ayrımından bağımsız olarak korunan iki kural:**

| Kural | Neden |
|-------|-------|
| Kimse başkasının adına işlem kaydı giremez (`islemi_yapan_user_id = auth.uid()`) | Audit izinin anlamı korunsun |
| `audit_log`'a uygulamadan yazılamaz / silinemez | Yalnızca `SECURITY DEFINER` trigger yazar |

Bu kurallar **Postgres RLS politikalarında** tanımlıdır. Uygulama katmanındaki
kontroller yalnızca daha iyi hata mesajı içindir; asıl güvenlik veritabanındadır.

Yukarıdakilerin tamamı canlı veritabanında, gerçek `personel` oturumu simüle
edilerek test edildi (11 senaryo, tamamı geçti). Test kullanıcıları ve verileri
sonrasında silindi.

### Rol ayrımını geri açmak

1. `src/lib/auth.ts` → `ROL_AYRIMI_AKTIF = true`
2. `0002_rls.sql` ve `0005_rls_initplan_and_fk_indexes.sql` içindeki RLS
   politikalarını tekrar uygulayın

**Yalnızca bayrağı çevirmek yetmez** — bayrak sadece arayüzü etkiler, yetkinin
asıl kapısı RLS'tir. Eski ayrım şöyleydi: personel arama/görüntüleme ve yeni
tahsilat/harcama girişi yapabilir; var olan kaydı düzeltmek ve silmek, öğrenci
eklemek/silmek, iskonto tanımlamak, kullanıcı ve ayar yönetimi yalnızca
admin'e aitti. Ara bir model (personel öğrenci ekler ama iskonto tanımlayamaz)
için `0006_students_insert_personel.sql` hazır bir örnek.

---

## İş kuralları

### Bakiye hesabı

`Alınan Para`, `Harcanan` ve `Kalan` **hiçbir yerde sabit alan olarak
tutulmaz**; `transactions` tablosundan türetilir:

```
Alınan Para = Σ tahsilat
Harcanan    = Σ harcama
Kalan       = devir + Alınan Para − Harcanan
```

Hesaplama `student_balances` view'inde yapılır
(`security_invoker = true` ile, yani view sorgulanırken de RLS geçerlidir).

### Abone tipi: günlükçü / aylıkçı

Her öğrenci kayıt sırasında **günlükçü** veya **aylıkçı** olarak işaretlenir
(`students.abone_tipi`). Renk kodu her yerde aynıdır:

| Tip | Renk | Yemek yediğinde |
|---|---|---|
| Günlükçü | **Mavi** | İskontolu günlük ücreti krediden düşülür |
| Aylıkçı | **Sarı** | 0 ₺ devam kaydı düşer — bakiyesine dokunulmaz |

Aylıkçıdan yemek başına ücret alınmaz, çünkü yıllık ücreti **taksit planından**
tahsil edilir; her yemekte ayrıca borçlandırmak aynı parayı iki kez almak olurdu.
Borç durumu Taksit Takibi raporundan izlenir.

### Yemekhane girişi

`/pos` ekranı, eski masaüstü programdaki "GÜNLÜK ABONE" ekranının karşılığıdır:
öğrenci no veya kimlik no yazılır (ya da kart okutulur), isim ve kredi anında
görünür — kredi eksiyse kırmızı, değilse yeşil — sonra öğün butonuna basılır.
Kayıt düştükten sonra ekran temizlenir ve odak tekrar arama kutusuna döner, bu
sayede sıra hızlı akar. `Enter` = ara, `Esc` = temizle.

Ekranda iki buton vardır: **Günlükçü** (mavi) ve **Aylıkçı** (sarı). Öğrencinin
kayıtlı tipi vurgulanır, ancak istisna durumlar için diğerine de basılabilir.
Öğrenci o gün zaten yemek yediyse ekran uyarır.

**Tutar hiçbir zaman istemciden gelmez.** Fiyatlandırmanın tek kaynağı
`ogun_kaydet()` Postgres fonksiyonudur: abone tipini, öğrencinin iskontosunu ve
taban ücreti okuyup tutarı hesaplar ve aynı çağrıda kaydı atar. Taban ücret
tanımlı değilse günlükçü kaydı sessizce 0 ₺ işlemek yerine hata verir.

### Raporlar

| Rapor | Ne gösterir |
|---|---|
| Cari Durum | Gelen–Giden–Tahsil Edilen, öğrenci bazlı kırılım + CSV |
| Gün Sonu | Her gün kaç kişi yemek yedi (günlükçü/aylıkçı kırılımıyla) |
| Devam Çizelgesi | Ay içinde gün gün kim geldi / gelmedi, "8 geldi, 12 gelmedi" |
| Tahsilat Geçmişi | Öğrencinin hesabına ne zaman ne kadar para girdi |
| Taksit Takibi | Aylıkçılardan hangisinin ödemesi gecikmiş |

**Taksit takibi** kümülatif çalışır: her vade tarihinde, o tarihe kadar birikmiş
taksit toplamı ile yılbaşından o tarihe kadarki tahsilat karşılaştırılır. Böylece
geç ama fazla yapılan ödeme sonraki taksiti de kapatır. Vade geçmiş ve eksik
varsa satır **ÖDEME ALINMALI** olarak kırmızı işaretlenir.

Taksit vadeleri ve tutarları **Ayarlar** sayfasından elle girilir (örn. yıllık
30.000 ₺ → Şubat/Mart/Haziran vadeli 3 × 10.000 ₺).

Devam çizelgesinde "gelmeyen gün" sayısı **hafta içi** günler üzerinden
hesaplanır; resmî tatiller hesaba katılmaz.

### Efektif günlük ücret

```
efektif = max(taban_gunluk_ucret − iskonto_tutar − (taban × iskonto_orani / 100), 0)
```

Bu değer harcama girilirken **referans olarak** gösterilir ("1 gün", "5 gün",
"22 gün" hızlı doldurma butonları) ancak tutar her zaman elle değiştirilebilir.

### Audit log

`students`, `transactions`, `profiles` ve `app_settings` tablolarındaki her
`UPDATE` ve `DELETE` işlemi, `log_audit()` trigger'ı ile `audit_log` tablosuna
eski/yeni değerleriyle birlikte otomatik yazılır. Audit kayıtları uygulama
katmanından yazılamaz veya değiştirilemez (`SECURITY DEFINER` trigger yazar,
`authenticated` rolünün INSERT/UPDATE/DELETE hakkı yoktur).

---

## Sayfalar

| Yol | Açıklama | Erişim |
|-----|----------|--------|
| `/login` | Supabase Auth ile e-posta + şifre girişi | herkes |
| `/pos` | **Yemekhane girişi** — no/kimlik ile hızlı arama, kredi göstergesi, öğün butonları | tümü |
| `/dashboard` | Tarih aralığı filtreli özet kartları + son 10 işlem | tümü |
| `/students` | Öğrenci listesi; ad/no araması, sınıf, borç durumu, kayıt durumu filtreleri | tümü |
| `/students/new` | Yeni öğrenci | admin |
| `/students/[id]` | Cari özet, veli/ücret bilgisi, işlem geçmişi, iskonto formu | tümü (düzenleme: admin) |
| `/students/[id]/edit` | Öğrenci bilgileri düzenleme | admin |
| `/payments/new` | Tahsilat / harcama girişi (öğrenci autocomplete) | tümü |
| `/reports` | Gelen–Giden–Tahsil Edilen raporu + CSV/Excel export | tümü |
| `/reports/gun-sonu` | Gün bazlı yemek yiyen kişi sayısı | tümü |
| `/reports/devam` | Aylık devam çizelgesi (gün gün geldi/gelmedi) | tümü |
| `/reports/tahsilat` | Öğrenci bazlı para girişi geçmişi | tümü |
| `/reports/taksit` | Aylıkçı taksit takibi, geciken ödemeler | tümü |
| `/reports/export` | CSV indirme uç noktası (UTF-8 BOM, `;` ayraç — Excel TR uyumlu) | tümü |
| `/admin/users` | Kullanıcı listesi, kullanıcı ekleme, rol atama | admin |
| `/admin/audit-log` | Düzeltme/silme geçmişi, alan bazlı fark görünümü | admin |
| `/admin/settings` | Taban günlük ücret | admin |

### Rapor sütunlarının anlamı

- **Dönem Tahsilat / Dönem Harcama** — seçilen tarih aralığındaki hareketler.
- **Toplam Gelen** — devir + dönem bitişine kadarki *tüm* tahsilat.
- **Toplam Giden** — dönem bitişine kadarki *tüm* harcama.
- **Kalan** — Toplam Gelen − Toplam Giden (kümülatif cari durum).

---

## Mimari notlar

- **Veri çekme** server component'lerde (`src/app/(app)/**/page.tsx`) yapılır.
  Client component'ler yalnızca form ve filtre gibi interaktif kısımlardadır.
- **Mutasyonlar** server action'larda (`actions.ts` dosyaları,
  `src/lib/transaction-actions.ts`). Hepsi önce rolü doğrular, sonra RLS
  altında çalışan kullanıcı oturumlu istemciyle yazar.
- **Oturum yenileme** `src/proxy.ts` içinde (Next.js 16'da `middleware`
  konvansiyonunun yerini `proxy` aldı). Girişsiz istekleri `/login`'e atar.
- **Service role anahtarı** yalnızca `src/lib/supabase/admin.ts` içinde,
  `server-only` ile korunan modülde kullanılır.

## Bu fazın kapsamı dışında

- Aylık takvim/abonelik ekranı (gün gün yemek işaretleme) — sonraki faz.
  Şu an harcamalar manuel tarih + tutar girişiyle kaydedilir.
- SMS bildirimi — veli telefonu saklanır, gönderim yapılmaz.
- Mobil uygulama — arayüz responsive'dir, öncelik masaüstüdür.

-- =============================================================
-- seed.sql — İlk kurulum yardımcıları (isteğe bağlı)
-- =============================================================

-- 1) Taban günlük yemek ücretini ayarla
update public.app_settings set taban_gunluk_ucret = 75.00 where id = 1;

-- 2) İLK ADMİN
-- Supabase Studio > Authentication > Users bölümünden bir kullanıcı
-- oluşturduktan sonra, o kullanıcıyı admin yapmak için:
--
--   update public.profiles
--   set rol = 'admin', ad_soyad = 'Sistem Yöneticisi'
--   where id = (select id from auth.users where email = 'admin@firma.com');
--
-- Bundan sonraki kullanıcılar uygulama içindeki /admin/users
-- sayfasından eklenebilir.

-- 3) Örnek öğrenciler (test için — canlıda çalıştırmayın)
-- insert into public.students (ogrenci_no, ad_soyad, sinif, veli_adi, veli_telefon, iskonto_orani, devir)
-- values
--   ('1001', 'Ayşe Yılmaz',  '5-A', 'Mehmet Yılmaz', '0532 000 00 01', 0,  0),
--   ('1002', 'Berk Demir',   '5-A', 'Selin Demir',   '0532 000 00 02', 10, 250),
--   ('1003', 'Ceren Aksoy',  '6-B', 'Hakan Aksoy',   '0532 000 00 03', 0,  -120);

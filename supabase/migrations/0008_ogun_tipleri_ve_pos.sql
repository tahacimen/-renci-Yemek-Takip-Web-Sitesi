-- =============================================================
-- 0008_ogun_tipleri_ve_pos.sql
--
-- Yemekhane giriş ekranı (eski masaüstü programdaki "GÜNLÜK ABONE"
-- ekranının karşılığı): öğrenci no / kimlik no ile hızlı arama +
-- Ücretli / Günlük Abone / Aylık Abone / Misafir butonları.
--
-- Butonların fiyatı KODA GÖMÜLÜ DEĞİL — ogun_tipleri tablosundan
-- okunur ve Ayarlar sayfasından düzenlenir.
-- =============================================================

create table if not exists public.ogun_tipleri (
  id             uuid primary key default gen_random_uuid(),
  kod            text not null unique,
  ad             text not null,
  -- Tutarın nereden hesaplanacağı:
  --   ogrenci_gunluk : taban ücret - öğrencinin iskontosu (efektif ücret)
  --   taban_gunluk   : taban ücret, iskonto UYGULANMAZ
  --   sabit          : sabit_tutar alanındaki değer
  --   ucretsiz       : 0 (yemek kaydı düşer ama bakiyeye dokunmaz)
  fiyat_kaynagi  text not null
                 check (fiyat_kaynagi in ('ogrenci_gunluk','taban_gunluk','sabit','ucretsiz')),
  sabit_tutar    numeric(12,2) not null default 0 check (sabit_tutar >= 0),
  sira           int not null default 0,
  aktif          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists ogun_tipleri_set_updated_at on public.ogun_tipleri;
create trigger ogun_tipleri_set_updated_at
  before update on public.ogun_tipleri
  for each row execute function public.set_updated_at();

drop trigger if exists ogun_tipleri_audit on public.ogun_tipleri;
create trigger ogun_tipleri_audit
  after update or delete on public.ogun_tipleri
  for each row execute function public.log_audit();

-- Eski programdaki dört buton. Fiyatlar Ayarlar sayfasından girilir.
insert into public.ogun_tipleri (kod, ad, fiyat_kaynagi, sabit_tutar, sira) values
  ('ucretli',      'Ücretli',       'taban_gunluk',   0, 1),
  ('gunluk_abone', 'Günlük Abone',  'ogrenci_gunluk', 0, 2),
  ('aylik_abone',  'Aylık Abone',   'ogrenci_gunluk', 0, 3),
  ('misafir',      'Misafir',       'sabit',          0, 4)
on conflict (kod) do nothing;

alter table public.ogun_tipleri enable row level security;
revoke all on public.ogun_tipleri from anon;

drop policy if exists ogun_tipleri_select on public.ogun_tipleri;
create policy ogun_tipleri_select on public.ogun_tipleri
  for select to authenticated using (true);
drop policy if exists ogun_tipleri_insert on public.ogun_tipleri;
create policy ogun_tipleri_insert on public.ogun_tipleri
  for insert to authenticated with check (true);
drop policy if exists ogun_tipleri_update on public.ogun_tipleri;
create policy ogun_tipleri_update on public.ogun_tipleri
  for update to authenticated using (true) with check (true);
drop policy if exists ogun_tipleri_delete on public.ogun_tipleri;
create policy ogun_tipleri_delete on public.ogun_tipleri
  for delete to authenticated using (true);

-- Hangi işlem hangi öğün tipinden geldi? (rapor kırılımı için)
alter table public.transactions
  add column if not exists ogun_tipi_id uuid references public.ogun_tipleri (id);
create index if not exists transactions_ogun_tipi_idx
  on public.transactions (ogun_tipi_id);

-- "Ücretsiz" öğün 0 TL kaydedilebilsin (yemek yendi ama bakiye değişmedi)
alter table public.transactions drop constraint if exists transactions_tutar_check;
alter table public.transactions
  add constraint transactions_tutar_check check (tutar >= 0);

-- Kimlik no ile hızlı arama (kart/barkod okutma)
create index if not exists students_kimlik_no_idx on public.students (kimlik_no);

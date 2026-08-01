-- =============================================================
-- 0010_abone_tipi_ve_taksit.sql
--
-- Öğün tipleri (Ücretli/Misafir/...) kaldırıldı. Yerine öğrencinin
-- kendi ABONE TİPİ geçti: günlükçü (mavi) / aylıkçı (sarı).
-- Ayrıca aylıkçıların yıllık ücret takvimi için taksit_plani tablosu.
-- =============================================================

do $$ begin
  create type public.abone_tipi as enum ('gunluk', 'aylik');
exception when duplicate_object then null; end $$;

alter table public.students
  add column if not exists abone_tipi public.abone_tipi not null default 'gunluk';
create index if not exists students_abone_tipi_idx on public.students (abone_tipi);

alter table public.transactions drop column if exists ogun_tipi_id;
alter table public.transactions
  add column if not exists ogun_abone_tipi public.abone_tipi;

drop table if exists public.ogun_tipleri cascade;

-- ---------- Taksit planı ----------
-- Vade tarihleri ve tutarlar Ayarlar sayfasından ELLE girilir.
-- Örn. yıllık 30.000 ₺ -> Şubat/Mart/Haziran vadeli 3 x 10.000 ₺
create table if not exists public.taksit_plani (
  id           uuid primary key default gen_random_uuid(),
  yil          int  not null check (yil between 2000 and 2100),
  ad           text not null,
  vade_tarihi  date not null,
  tutar        numeric(12,2) not null check (tutar > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (yil, ad)
);

create index if not exists taksit_plani_yil_idx on public.taksit_plani (yil, vade_tarihi);

drop trigger if exists taksit_plani_set_updated_at on public.taksit_plani;
create trigger taksit_plani_set_updated_at
  before update on public.taksit_plani
  for each row execute function public.set_updated_at();

drop trigger if exists taksit_plani_audit on public.taksit_plani;
create trigger taksit_plani_audit
  after update or delete on public.taksit_plani
  for each row execute function public.log_audit();

alter table public.taksit_plani enable row level security;
revoke all on public.taksit_plani from anon;

drop policy if exists taksit_plani_select on public.taksit_plani;
create policy taksit_plani_select on public.taksit_plani
  for select to authenticated using (true);
drop policy if exists taksit_plani_insert on public.taksit_plani;
create policy taksit_plani_insert on public.taksit_plani
  for insert to authenticated with check (true);
drop policy if exists taksit_plani_update on public.taksit_plani;
create policy taksit_plani_update on public.taksit_plani
  for update to authenticated using (true) with check (true);
drop policy if exists taksit_plani_delete on public.taksit_plani;
create policy taksit_plani_delete on public.taksit_plani
  for delete to authenticated using (true);

-- ---------- student_balances: abone_tipi eklendi ----------
drop view if exists public.student_balances;
create view public.student_balances
with (security_invoker = true) as
select
  s.id as student_id,
  s.ogrenci_no, s.ad_soyad, s.sinif, s.kimlik_no,
  s.veli_adi, s.veli_telefon,
  s.iskonto_orani, s.iskonto_tutar, s.devir, s.aktif,
  s.abone_tipi,
  s.created_at,
  coalesce(agg.alinan_para, 0)::numeric(14, 2)  as alinan_para,
  coalesce(agg.harcanan, 0)::numeric(14, 2)     as harcanan,
  (s.devir + coalesce(agg.alinan_para, 0) - coalesce(agg.harcanan, 0))::numeric(14, 2) as kalan,
  public.hesapla_efektif_ucret(cfg.taban, s.iskonto_orani, s.iskonto_tutar) as efektif_gunluk_ucret,
  agg.son_islem_tarihi,
  coalesce(agg.islem_sayisi, 0) as islem_sayisi
from public.students s
left join lateral (
  select coalesce((select a.taban_gunluk_ucret from public.app_settings a where a.id = 1), 0) as taban
) cfg on true
left join lateral (
  select
    sum(t.tutar) filter (where t.tip = 'tahsilat') as alinan_para,
    sum(t.tutar) filter (where t.tip = 'harcama')  as harcanan,
    max(t.tarih) as son_islem_tarihi,
    count(*)     as islem_sayisi
  from public.transactions t
  where t.student_id = s.id
) agg on true;

grant select on public.student_balances to authenticated;

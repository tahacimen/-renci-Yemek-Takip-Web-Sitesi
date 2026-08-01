-- =============================================================
-- 0003_views_functions.sql — Hesaplanan bakiye view'i ve rapor fonksiyonları
--
-- Alınan Para / Harcanan / Kalan hiçbir yerde sabit alan olarak
-- tutulmaz; hepsi transactions tablosundan türetilir.
-- =============================================================

-- ---------- Efektif günlük ücret ----------
-- taban - iskonto_tutar - (taban * iskonto_orani / 100), en az 0
create or replace function public.hesapla_efektif_ucret(
  p_taban          numeric,
  p_iskonto_orani  numeric,
  p_iskonto_tutar  numeric
)
returns numeric
language sql
immutable
as $$
  select greatest(
    round(coalesce(p_taban, 0)
          - coalesce(p_iskonto_tutar, 0)
          - (coalesce(p_taban, 0) * coalesce(p_iskonto_orani, 0) / 100.0), 2),
    0
  );
$$;

-- ---------- student_balances ----------
-- security_invoker: view sorgulanırken çağıran kullanıcının RLS'i uygulanır.
drop view if exists public.student_balances;
create view public.student_balances
with (security_invoker = true) as
select
  s.id                                as student_id,
  s.ogrenci_no,
  s.ad_soyad,
  s.sinif,
  s.kimlik_no,
  s.veli_adi,
  s.veli_telefon,
  s.iskonto_orani,
  s.iskonto_tutar,
  s.devir,
  s.aktif,
  s.created_at,
  coalesce(agg.alinan_para, 0)::numeric(14, 2)  as alinan_para,
  coalesce(agg.harcanan, 0)::numeric(14, 2)     as harcanan,
  (s.devir + coalesce(agg.alinan_para, 0) - coalesce(agg.harcanan, 0))::numeric(14, 2) as kalan,
  public.hesapla_efektif_ucret(cfg.taban, s.iskonto_orani, s.iskonto_tutar) as efektif_gunluk_ucret,
  agg.son_islem_tarihi,
  coalesce(agg.islem_sayisi, 0)                 as islem_sayisi
from public.students s
left join lateral (
  select coalesce((select a.taban_gunluk_ucret from public.app_settings a where a.id = 1), 0) as taban
) cfg on true
left join lateral (
  select
    sum(t.tutar) filter (where t.tip = 'tahsilat') as alinan_para,
    sum(t.tutar) filter (where t.tip = 'harcama')  as harcanan,
    max(t.tarih)                                   as son_islem_tarihi,
    count(*)                                       as islem_sayisi
  from public.transactions t
  where t.student_id = s.id
) agg on true;

grant select on public.student_balances to authenticated;

-- =============================================================
-- Rapor: öğrenci bazlı kırılım
--   donem_*  : seçilen tarih aralığındaki hareketler
--   toplam_* : dönem bitişine kadarki kümülatif durum (devir dahil)
-- =============================================================
create or replace function public.rapor_detay(
  p_baslangic  date,
  p_bitis      date,
  p_sinif      text default null,
  p_student_id uuid default null,
  p_sadece_aktif boolean default true
)
returns table (
  student_id      uuid,
  ogrenci_no      text,
  ad_soyad        text,
  sinif           text,
  devir           numeric,
  donem_tahsilat  numeric,
  donem_harcama   numeric,
  toplam_gelen    numeric,
  toplam_giden    numeric,
  kalan           numeric
)
language sql
stable
set search_path = public
as $$
  select
    s.id,
    s.ogrenci_no,
    s.ad_soyad,
    s.sinif,
    s.devir,
    coalesce(d.tahsilat, 0)::numeric(14, 2),
    coalesce(d.harcama, 0)::numeric(14, 2),
    (s.devir + coalesce(k.tahsilat, 0))::numeric(14, 2),
    coalesce(k.harcama, 0)::numeric(14, 2),
    (s.devir + coalesce(k.tahsilat, 0) - coalesce(k.harcama, 0))::numeric(14, 2)
  from public.students s
  left join lateral (
    select
      sum(t.tutar) filter (where t.tip = 'tahsilat') as tahsilat,
      sum(t.tutar) filter (where t.tip = 'harcama')  as harcama
    from public.transactions t
    where t.student_id = s.id
      and t.tarih between p_baslangic and p_bitis
  ) d on true
  left join lateral (
    select
      sum(t.tutar) filter (where t.tip = 'tahsilat') as tahsilat,
      sum(t.tutar) filter (where t.tip = 'harcama')  as harcama
    from public.transactions t
    where t.student_id = s.id
      and t.tarih <= p_bitis
  ) k on true
  where (p_sinif is null or s.sinif = p_sinif)
    and (p_student_id is null or s.id = p_student_id)
    and (not p_sadece_aktif or s.aktif)
  order by s.ad_soyad;
$$;

grant execute on function public.rapor_detay(date, date, text, uuid, boolean) to authenticated;

-- =============================================================
-- Dashboard özeti
-- =============================================================
create or replace function public.dashboard_ozet(
  p_baslangic date,
  p_bitis     date
)
returns table (
  donem_tahsilat  numeric,
  donem_harcama   numeric,
  toplam_gelen    numeric,
  toplam_giden    numeric,
  toplam_kalan    numeric,
  aktif_ogrenci   bigint,
  borclu_ogrenci  bigint
)
language sql
stable
set search_path = public
as $$
  with donem as (
    select
      coalesce(sum(t.tutar) filter (where t.tip = 'tahsilat'), 0) as tahsilat,
      coalesce(sum(t.tutar) filter (where t.tip = 'harcama'), 0)  as harcama
    from public.transactions t
    join public.students s on s.id = t.student_id
    where t.tarih between p_baslangic and p_bitis
  ),
  bakiye as (
    select
      coalesce(sum(b.devir + b.alinan_para), 0) as gelen,
      coalesce(sum(b.harcanan), 0)              as giden,
      count(*) filter (where b.aktif)           as aktif_sayi,
      count(*) filter (where b.aktif and b.kalan < 0) as borclu_sayi
    from public.student_balances b
  )
  select
    donem.tahsilat::numeric(14, 2),
    donem.harcama::numeric(14, 2),
    bakiye.gelen::numeric(14, 2),
    bakiye.giden::numeric(14, 2),
    (bakiye.gelen - bakiye.giden)::numeric(14, 2),
    bakiye.aktif_sayi,
    bakiye.borclu_sayi
  from donem, bakiye;
$$;

grant execute on function public.dashboard_ozet(date, date) to authenticated;

-- =============================================================
-- Sınıf listesi (filtre açılır menüsü için)
-- =============================================================
create or replace function public.sinif_listesi()
returns table (sinif text)
language sql
stable
set search_path = public
as $$
  select distinct s.sinif
  from public.students s
  where s.sinif is not null and s.sinif <> ''
  order by 1;
$$;

grant execute on function public.sinif_listesi() to authenticated;

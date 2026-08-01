-- =============================================================
-- 0012_rapor_taksit_ve_tahsilat.sql
-- =============================================================

-- RAPOR 3: Öğrenci bazlı tahsilat geçmişi
-- "Ocak/Şubat/Mart'ta para girişi yapıldı" — tarih ve tutarlarıyla.
create or replace function public.rapor_tahsilatlar(
  p_baslangic date, p_bitis date,
  p_student_id uuid default null, p_sinif text default null
)
returns table (
  transaction_id uuid, student_id uuid, ogrenci_no text, ad_soyad text,
  sinif text, abone_tipi public.abone_tipi,
  tarih date, tutar numeric, aciklama text, kaydeden text
)
language sql stable set search_path = public
as $$
  select t.id, s.id, s.ogrenci_no, s.ad_soyad, s.sinif, s.abone_tipi,
         t.tarih, t.tutar, t.aciklama, coalesce(p.ad_soyad, '')
  from public.transactions t
  join public.students s on s.id = t.student_id
  left join public.profiles p on p.id = t.islemi_yapan_user_id
  where t.tip = 'tahsilat'
    and t.tarih between p_baslangic and p_bitis
    and (p_student_id is null or s.id = p_student_id)
    and (p_sinif is null or s.sinif = p_sinif)
  order by s.ad_soyad, t.tarih;
$$;

grant execute on function public.rapor_tahsilatlar(date, date, uuid, text) to authenticated;

-- =============================================================
-- RAPOR 4: Taksit takibi (yalnızca AYLIKÇI öğrenciler)
--
-- Kümülatif mantık: her vade tarihinde, o tarihe kadar birikmiş taksit
-- toplamı ile yılbaşından o tarihe kadar yapılan tahsilat toplamı
-- karşılaştırılır. Geç ama fazla ödeme sonraki taksiti de kapatır.
--
-- durum:
--   odendi   -> o vadeye kadar borç kapanmış
--   gecikmis -> vade geçmiş ve eksik var  ("ÖDEME ALINMALI")
--   bekliyor -> vade gelmemiş, eksik var
-- =============================================================
create or replace function public.rapor_taksit(
  p_yil int, p_sinif text default null, p_sadece_gecikmis boolean default false
)
returns table (
  student_id uuid, ogrenci_no text, ad_soyad text, sinif text,
  veli_adi text, veli_telefon text,
  taksit_id uuid, taksit_adi text, vade_tarihi date, taksit_tutari numeric,
  kumulatif_beklenen numeric, odenen numeric, eksik_tutar numeric, durum text
)
language sql stable set search_path = public
as $$
  with plan as (
    select tp.id, tp.ad, tp.vade_tarihi, tp.tutar,
           sum(tp.tutar) over (order by tp.vade_tarihi, tp.ad
                               rows between unbounded preceding and current row) as kumulatif
    from public.taksit_plani tp
    where tp.yil = p_yil
  ),
  ogrenciler as (
    select s.* from public.students s
    where s.aktif and s.abone_tipi = 'aylik'
      and (p_sinif is null or s.sinif = p_sinif)
  ),
  satirlar as (
    select
      o.id as student_id, o.ogrenci_no, o.ad_soyad, o.sinif,
      o.veli_adi, o.veli_telefon,
      pl.id as taksit_id, pl.ad as taksit_adi, pl.vade_tarihi,
      pl.tutar as taksit_tutari, pl.kumulatif as kumulatif_beklenen,
      coalesce((
        select sum(t.tutar) from public.transactions t
        where t.student_id = o.id and t.tip = 'tahsilat'
          and t.tarih >= make_date(p_yil, 1, 1)
          and t.tarih <= pl.vade_tarihi
      ), 0) as odenen
    from ogrenciler o cross join plan pl
  )
  select
    s.student_id, s.ogrenci_no, s.ad_soyad, s.sinif, s.veli_adi, s.veli_telefon,
    s.taksit_id, s.taksit_adi, s.vade_tarihi,
    s.taksit_tutari::numeric(14,2),
    s.kumulatif_beklenen::numeric(14,2),
    s.odenen::numeric(14,2),
    greatest(s.kumulatif_beklenen - s.odenen, 0)::numeric(14,2),
    case
      when s.odenen >= s.kumulatif_beklenen then 'odendi'
      when s.vade_tarihi < current_date     then 'gecikmis'
      else 'bekliyor'
    end
  from satirlar s
  where not p_sadece_gecikmis
     or (s.odenen < s.kumulatif_beklenen and s.vade_tarihi < current_date)
  order by s.ad_soyad, s.vade_tarihi;
$$;

grant execute on function public.rapor_taksit(int, text, boolean) to authenticated;

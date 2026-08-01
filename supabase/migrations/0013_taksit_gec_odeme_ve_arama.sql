-- =============================================================
-- 0013_taksit_gec_odeme_ve_arama.sql
--
-- 1) TAKSİT RAPORU DÜZELTMESİ — geç yapılan ödeme de borcu azaltmalı.
--    Önce "odenen" yalnızca vade tarihine kadarki tahsilatları sayıyordu.
--    Vadeden SONRA yapılan kısmi ödeme hiç görünmüyor, öğrenci taksitin
--    tamamı kadar borçlu çıkıyordu.
--    Örn: vade 20 Tem / 10.000 ₺, ödeme 24 Tem / 5.000 ₺
--         -> eskiden: eksik 10.000  (yanlış)
--         -> şimdi  : eksik  5.000, durum gecikmis  (doğru)
--
-- 2) ogrenci_ara — yemekhane ekranında harfe göre canlı liste.
-- 3) rapor_devam_yil — tek öğrencinin yıl boyu ay ay devamı.
-- =============================================================

drop function if exists public.rapor_taksit(int, text, boolean);

create or replace function public.rapor_taksit(
  p_yil int, p_sinif text default null, p_sadece_gecikmis boolean default false
)
returns table (
  student_id uuid, ogrenci_no text, ad_soyad text, sinif text,
  veli_adi text, veli_telefon text,
  taksit_id uuid, taksit_adi text, vade_tarihi date, taksit_tutari numeric,
  kumulatif_beklenen numeric, odenen numeric, eksik_tutar numeric,
  vadesinde_odenen numeric, durum text
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
  odemeler as (
    -- Yıl içindeki TÜM tahsilat (geç ödemeler dahil)
    select o.id as sid,
           coalesce((select sum(t.tutar) from public.transactions t
                     where t.student_id = o.id and t.tip = 'tahsilat'
                       and t.tarih >= make_date(p_yil, 1, 1)
                       and t.tarih <= make_date(p_yil, 12, 31)), 0) as toplam
    from ogrenciler o
  ),
  satirlar as (
    select
      o.id as student_id, o.ogrenci_no, o.ad_soyad, o.sinif,
      o.veli_adi, o.veli_telefon,
      pl.id as taksit_id, pl.ad as taksit_adi, pl.vade_tarihi,
      pl.tutar as taksit_tutari, pl.kumulatif as kumulatif_beklenen,
      od.toplam as odenen,
      -- Bilgi amaçlı: vadesi içinde tahsil edilen kısım
      coalesce((select sum(t.tutar) from public.transactions t
                where t.student_id = o.id and t.tip = 'tahsilat'
                  and t.tarih >= make_date(p_yil, 1, 1)
                  and t.tarih <= pl.vade_tarihi), 0) as vadesinde_odenen
    from ogrenciler o
    join odemeler od on od.sid = o.id
    cross join plan pl
  )
  select
    s.student_id, s.ogrenci_no, s.ad_soyad, s.sinif, s.veli_adi, s.veli_telefon,
    s.taksit_id, s.taksit_adi, s.vade_tarihi,
    s.taksit_tutari::numeric(14,2),
    s.kumulatif_beklenen::numeric(14,2),
    s.odenen::numeric(14,2),
    greatest(s.kumulatif_beklenen - s.odenen, 0)::numeric(14,2),
    s.vadesinde_odenen::numeric(14,2),
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

-- =============================================================
-- ogrenci_ara: ad / no / kimlik içinde arar, LİSTE döner.
-- ogrenci_bul yalnızca tam eşleşme yapıyordu.
-- Tam eşleşmeler başta gelir; barkod okutmada tek sonuç olup
-- arayüz tarafından otomatik seçilir.
-- =============================================================
create or replace function public.ogrenci_ara(
  p_terim text,
  p_limit int default 25
)
returns table (
  student_id uuid, ogrenci_no text, ad_soyad text, sinif text,
  veli_adi text, veli_telefon text, aktif boolean,
  abone_tipi public.abone_tipi,
  kalan numeric, efektif_gunluk_ucret numeric, bugun_yedi boolean,
  tam_eslesme boolean
)
language sql stable security invoker set search_path = public
as $$
  with t as (select btrim(coalesce(p_terim, '')) as q)
  select b.student_id, b.ogrenci_no, b.ad_soyad, b.sinif, b.veli_adi,
         b.veli_telefon, b.aktif, b.abone_tipi, b.kalan, b.efektif_gunluk_ucret,
         exists (select 1 from public.transactions tr
                  where tr.student_id = b.student_id
                    and tr.tip = 'harcama' and tr.tarih = current_date),
         (lower(b.ogrenci_no) = lower(t.q)
          or lower(coalesce(b.kimlik_no, '')) = lower(t.q))
  from public.student_balances b, t
  where t.q <> ''
    and b.aktif
    and (
      b.ogrenci_no ilike t.q || '%'
      or coalesce(b.kimlik_no, '') ilike t.q || '%'
      or b.ad_soyad ilike '%' || t.q || '%'
    )
  order by
    (lower(b.ogrenci_no) = lower(t.q)
     or lower(coalesce(b.kimlik_no, '')) = lower(t.q)) desc,
    b.ad_soyad
  limit greatest(coalesce(p_limit, 25), 1);
$$;

grant execute on function public.ogrenci_ara(text, int) to authenticated;

-- =============================================================
-- rapor_devam_yil: TEK öğrencinin bir yıl boyunca ay ay / gün gün
-- devam durumu. 12 satır döner.
-- =============================================================
create or replace function public.rapor_devam_yil(
  p_student_id uuid,
  p_yil        int
)
returns table (
  ay int, gelen_gunler int[], gelen_gun int,
  hafta_ici_gun int, gelmeyen_gun int, ay_tutari numeric
)
language sql stable set search_path = public
as $$
  with aylar as (select generate_series(1, 12) as ay),
  sinirlar as (
    select a.ay,
           make_date(p_yil, a.ay, 1) as bas,
           (make_date(p_yil, a.ay, 1) + interval '1 month - 1 day')::date as bit
    from aylar a
  ),
  haftaici as (
    select s.ay, count(*)::int as gun
    from sinirlar s, generate_series(s.bas, s.bit, interval '1 day') g
    where extract(isodow from g) < 6
    group by s.ay
  )
  select
    s.ay,
    coalesce(d.gunler, array[]::int[]),
    coalesce(array_length(d.gunler, 1), 0),
    h.gun,
    greatest(h.gun - coalesce(array_length(d.gunler, 1), 0), 0),
    coalesce(d.tutar, 0)::numeric(14,2)
  from sinirlar s
  join haftaici h on h.ay = s.ay
  left join lateral (
    select array_agg(distinct extract(day from t.tarih)::int
                     order by extract(day from t.tarih)::int) as gunler,
           sum(t.tutar) as tutar
    from public.transactions t
    where t.student_id = p_student_id and t.tip = 'harcama'
      and t.tarih between s.bas and s.bit
  ) d on true
  order by s.ay;
$$;

grant execute on function public.rapor_devam_yil(uuid, int) to authenticated;

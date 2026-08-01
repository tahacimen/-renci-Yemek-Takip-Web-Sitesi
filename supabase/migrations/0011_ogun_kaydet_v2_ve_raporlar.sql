-- =============================================================
-- 0011_ogun_kaydet_v2_ve_raporlar.sql
--
-- Yemek kaydı artık abone tipine göre fiyatlanır:
--   gunluk : iskontolu günlük ücret krediden düşülür
--   aylik  : 0 ₺ devam kaydı — ücret taksit planından tahsil edildiği
--            için yemek başına ayrıca borçlandırılmaz
--
-- Ayrıca dört rapor fonksiyonu.
-- =============================================================

drop function if exists public.ogun_kaydet(uuid, uuid, date, int, text);
drop function if exists public.ogrenci_bul(text);

create or replace function public.ogun_kaydet(
  p_student_id uuid,
  p_ogun_tipi  public.abone_tipi,
  p_tarih      date default current_date,
  p_aciklama   text default null
)
returns table (transaction_id uuid, tutar numeric, ogun_adi text, yeni_kalan numeric)
language plpgsql security invoker set search_path = public
as $$
declare
  v_ogr public.students%rowtype; v_taban numeric; v_tutar numeric;
  v_ad text; v_tx uuid; v_kalan numeric;
begin
  select * into v_ogr from public.students where id = p_student_id;
  if not found then raise exception 'Öğrenci bulunamadı.'; end if;
  if not v_ogr.aktif then
    raise exception 'Bu öğrenci pasif durumda, işlem yapılamaz.';
  end if;

  select coalesce(taban_gunluk_ucret, 0) into v_taban
    from public.app_settings where id = 1;

  if p_ogun_tipi = 'gunluk' then
    v_ad := 'Günlükçü';
    v_tutar := public.hesapla_efektif_ucret(v_taban, v_ogr.iskonto_orani, v_ogr.iskonto_tutar);
    if v_tutar <= 0 then
      raise exception 'Günlük ücret 0 hesaplandı. Ayarlar sayfasından taban günlük ücreti girin.';
    end if;
  else
    v_ad := 'Aylıkçı';
    v_tutar := 0;
  end if;

  insert into public.transactions
    (student_id, tarih, tip, tutar, aciklama, islemi_yapan_user_id, ogun_abone_tipi)
  values (p_student_id, coalesce(p_tarih, current_date), 'harcama', v_tutar,
          coalesce(nullif(btrim(p_aciklama), ''), v_ad || ' yemek'),
          auth.uid(), p_ogun_tipi)
  returning id into v_tx;

  select b.kalan into v_kalan from public.student_balances b where b.student_id = p_student_id;
  return query select v_tx, v_tutar, v_ad, v_kalan;
end;
$$;

grant execute on function public.ogun_kaydet(uuid, public.abone_tipi, date, text) to authenticated;

-- Hızlı arama: abone tipi + bugün yemek yedi mi bilgisiyle
create or replace function public.ogrenci_bul(p_kod text)
returns table (
  student_id uuid, ogrenci_no text, ad_soyad text, sinif text,
  veli_adi text, veli_telefon text, aktif boolean,
  abone_tipi public.abone_tipi,
  kalan numeric, efektif_gunluk_ucret numeric, bugun_yedi boolean
)
language sql stable security invoker set search_path = public
as $$
  select b.student_id, b.ogrenci_no, b.ad_soyad, b.sinif, b.veli_adi,
         b.veli_telefon, b.aktif, b.abone_tipi, b.kalan, b.efektif_gunluk_ucret,
         exists (select 1 from public.transactions t
                  where t.student_id = b.student_id
                    and t.tip = 'harcama' and t.tarih = current_date)
  from public.student_balances b
  where btrim(p_kod) <> ''
    and (lower(b.ogrenci_no) = lower(btrim(p_kod))
         or lower(coalesce(b.kimlik_no, '')) = lower(btrim(p_kod)))
  order by b.aktif desc limit 1;
$$;

grant execute on function public.ogrenci_bul(text) to authenticated;

-- =============================================================
-- RAPOR 1: Gün sonu — o gün kaç kişi yemek yedi
-- Kişi sayısı TEKİL öğrenci olarak sayılır.
-- =============================================================
create or replace function public.rapor_gun_sonu(
  p_baslangic date, p_bitis date, p_sinif text default null
)
returns table (tarih date, toplam_kisi bigint, gunlukcu bigint,
               aylikci bigint, toplam_tutar numeric)
language sql stable set search_path = public
as $$
  select t.tarih,
    count(distinct t.student_id),
    count(distinct t.student_id) filter (where s.abone_tipi = 'gunluk'),
    count(distinct t.student_id) filter (where s.abone_tipi = 'aylik'),
    coalesce(sum(t.tutar), 0)::numeric(14,2)
  from public.transactions t
  join public.students s on s.id = t.student_id
  where t.tip = 'harcama'
    and t.tarih between p_baslangic and p_bitis
    and (p_sinif is null or s.sinif = p_sinif)
  group by t.tarih
  order by t.tarih desc;
$$;

grant execute on function public.rapor_gun_sonu(date, date, text) to authenticated;

-- =============================================================
-- RAPOR 2: Aylık devam çizelgesi — hangi gün geldi / gelmedi
-- "gelmeyen gün" HAFTA İÇİ günler üzerinden hesaplanır
-- (resmî tatiller hesaba katılmaz).
-- =============================================================
create or replace function public.rapor_devam(
  p_yil int, p_ay int, p_sinif text default null, p_student_id uuid default null
)
returns table (
  student_id uuid, ogrenci_no text, ad_soyad text, sinif text,
  abone_tipi public.abone_tipi,
  gelen_gunler int[], gelen_gun int, hafta_ici_gun int, gelmeyen_gun int
)
language sql stable set search_path = public
as $$
  with sinirlar as (
    select make_date(p_yil, p_ay, 1) as bas,
           (make_date(p_yil, p_ay, 1) + interval '1 month - 1 day')::date as bit
  ),
  haftaici as (
    select count(*)::int as gun
    from sinirlar, generate_series(sinirlar.bas, sinirlar.bit, interval '1 day') g
    where extract(isodow from g) < 6
  )
  select s.id, s.ogrenci_no, s.ad_soyad, s.sinif, s.abone_tipi,
    coalesce(d.gunler, array[]::int[]),
    coalesce(array_length(d.gunler, 1), 0),
    haftaici.gun,
    greatest(haftaici.gun - coalesce(array_length(d.gunler, 1), 0), 0)
  from public.students s
  cross join sinirlar cross join haftaici
  left join lateral (
    select array_agg(distinct extract(day from t.tarih)::int
                     order by extract(day from t.tarih)::int) as gunler
    from public.transactions t
    where t.student_id = s.id and t.tip = 'harcama'
      and t.tarih between sinirlar.bas and sinirlar.bit
  ) d on true
  where s.aktif
    and (p_sinif is null or s.sinif = p_sinif)
    and (p_student_id is null or s.id = p_student_id)
  order by s.ad_soyad;
$$;

grant execute on function public.rapor_devam(int, int, text, uuid) to authenticated;

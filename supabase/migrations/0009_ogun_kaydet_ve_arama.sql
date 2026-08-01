-- =============================================================
-- 0009_ogun_kaydet_ve_arama.sql
--
-- Yemekhane ekranının iki RPC'si.
--
-- ogun_kaydet, öğün fiyatlandırmasının TEK kaynağıdır. Tutar hiçbir
-- zaman istemciden gelmez: öğün tipi + öğrencinin iskontosu + taban
-- ücret okunup burada hesaplanır ve aynı çağrıda kayıt atılır.
-- SECURITY INVOKER olduğu için RLS geçerlidir ve
-- islemi_yapan_user_id = auth.uid() politikası zorlanır.
-- =============================================================

create or replace function public.ogun_kaydet(
  p_student_id   uuid,
  p_ogun_tipi_id uuid,
  p_tarih        date default current_date,
  p_gun_sayisi   int  default 1,
  p_aciklama     text default null
)
returns table (transaction_id uuid, tutar numeric, ogun_adi text, yeni_kalan numeric)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tip    public.ogun_tipleri%rowtype;
  v_ogr    public.students%rowtype;
  v_taban  numeric;
  v_birim  numeric;
  v_tutar  numeric;
  v_tx     uuid;
  v_kalan  numeric;
begin
  if p_gun_sayisi is null or p_gun_sayisi < 1 or p_gun_sayisi > 31 then
    raise exception 'Gün sayısı 1 ile 31 arasında olmalı.';
  end if;

  select * into v_tip from public.ogun_tipleri where id = p_ogun_tipi_id and aktif;
  if not found then
    raise exception 'Öğün tipi bulunamadı veya pasif.';
  end if;

  select * into v_ogr from public.students where id = p_student_id;
  if not found then
    raise exception 'Öğrenci bulunamadı.';
  end if;
  if not v_ogr.aktif then
    raise exception 'Bu öğrenci pasif durumda, işlem yapılamaz.';
  end if;

  select coalesce(taban_gunluk_ucret, 0) into v_taban
    from public.app_settings where id = 1;

  v_birim := case v_tip.fiyat_kaynagi
    when 'ogrenci_gunluk' then
      public.hesapla_efektif_ucret(v_taban, v_ogr.iskonto_orani, v_ogr.iskonto_tutar)
    when 'taban_gunluk' then v_taban
    when 'sabit'        then v_tip.sabit_tutar
    when 'ucretsiz'     then 0
  end;

  v_tutar := round(coalesce(v_birim, 0) * p_gun_sayisi, 2);

  -- Fiyatı tanımlanmamış bir buton sessizce 0 TL işlemesin
  if v_tutar = 0 and v_tip.fiyat_kaynagi <> 'ucretsiz' then
    raise exception
      '"%" için ücret 0 hesaplandı. Ayarlar sayfasından taban günlük ücreti veya bu öğünün fiyatını girin.',
      v_tip.ad;
  end if;

  insert into public.transactions
    (student_id, tarih, tip, tutar, aciklama, islemi_yapan_user_id, ogun_tipi_id)
  values (
    p_student_id,
    coalesce(p_tarih, current_date),
    'harcama',
    v_tutar,
    coalesce(
      nullif(btrim(p_aciklama), ''),
      v_tip.ad || case when p_gun_sayisi > 1
                       then ' — ' || p_gun_sayisi || ' gün'
                       else '' end
    ),
    auth.uid(),
    v_tip.id
  )
  returning id into v_tx;

  select b.kalan into v_kalan
    from public.student_balances b where b.student_id = p_student_id;

  return query select v_tx, v_tutar, v_tip.ad, v_kalan;
end;
$$;

grant execute on function public.ogun_kaydet(uuid, uuid, date, int, text) to authenticated;

-- =============================================================
-- ogrenci_bul: numara VEYA kimlik no ile tek öğrenci getirir.
-- Yemekhane ekranında kart/barkod okutulduğunda kullanılır.
-- =============================================================
create or replace function public.ogrenci_bul(p_kod text)
returns table (
  student_id           uuid,
  ogrenci_no           text,
  ad_soyad             text,
  sinif                text,
  veli_adi             text,
  veli_telefon         text,
  aktif                boolean,
  kalan                numeric,
  efektif_gunluk_ucret numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select b.student_id, b.ogrenci_no, b.ad_soyad, b.sinif, b.veli_adi,
         b.veli_telefon, b.aktif, b.kalan, b.efektif_gunluk_ucret
  from public.student_balances b
  where btrim(p_kod) <> ''
    and (lower(b.ogrenci_no) = lower(btrim(p_kod))
         or lower(coalesce(b.kimlik_no, '')) = lower(btrim(p_kod)))
  order by b.aktif desc
  limit 1;
$$;

grant execute on function public.ogrenci_bul(text) to authenticated;

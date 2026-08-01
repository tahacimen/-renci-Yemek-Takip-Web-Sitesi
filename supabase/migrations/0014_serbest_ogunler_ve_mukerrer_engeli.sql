-- =============================================================
-- 0014_serbest_ogunler_ve_mukerrer_engeli.sql
--
-- 1) Aynı gün aynı öğrenciye ikinci yemek kaydı ARTIK ENGELLENİYOR.
--    (Eskiden arayüz sadece uyarıyordu.)
-- 2) Ücretli / Misafir: öğrenciye bağlı OLMAYAN, isimsiz öğün kayıtları.
--    ucretli -> kapıda nakit ödeyen; kasaya para girer
--    misafir -> personel / ziyaretçi
-- 3) Gün sonu raporu bunları da sayar; ayrıca gün gün nakit raporu.
-- =============================================================

-- ---------- Ücretli / Misafir fiyatları ----------
-- 0 bırakılırsa: ücretli -> taban günlük ücret, misafir -> ücretsiz
alter table public.app_settings
  add column if not exists ucretli_ogun_ucreti numeric(12,2) not null default 0
    check (ucretli_ogun_ucreti >= 0),
  add column if not exists misafir_ogun_ucreti numeric(12,2) not null default 0
    check (misafir_ogun_ucreti >= 0);

-- ---------- Serbest öğünler ----------
do $$ begin
  create type public.serbest_ogun_tipi as enum ('ucretli', 'misafir');
exception when duplicate_object then null; end $$;

create table if not exists public.serbest_ogunler (
  id                   uuid primary key default gen_random_uuid(),
  tarih                date not null default current_date,
  tip                  public.serbest_ogun_tipi not null,
  tutar                numeric(12,2) not null check (tutar >= 0),
  aciklama             text,
  islemi_yapan_user_id uuid references auth.users (id) on delete set null,
  created_at           timestamptz not null default now()
);

create index if not exists serbest_ogunler_tarih_idx on public.serbest_ogunler (tarih);
create index if not exists serbest_ogunler_tip_idx   on public.serbest_ogunler (tip);
create index if not exists serbest_ogunler_user_idx  on public.serbest_ogunler (islemi_yapan_user_id);

drop trigger if exists serbest_ogunler_audit on public.serbest_ogunler;
create trigger serbest_ogunler_audit
  after update or delete on public.serbest_ogunler
  for each row execute function public.log_audit();

alter table public.serbest_ogunler enable row level security;
revoke all on public.serbest_ogunler from anon;

drop policy if exists serbest_ogunler_select on public.serbest_ogunler;
create policy serbest_ogunler_select on public.serbest_ogunler
  for select to authenticated using (true);
drop policy if exists serbest_ogunler_insert on public.serbest_ogunler;
create policy serbest_ogunler_insert on public.serbest_ogunler
  for insert to authenticated
  with check (islemi_yapan_user_id = (select auth.uid()));
drop policy if exists serbest_ogunler_update on public.serbest_ogunler;
create policy serbest_ogunler_update on public.serbest_ogunler
  for update to authenticated using (true) with check (true);
drop policy if exists serbest_ogunler_delete on public.serbest_ogunler;
create policy serbest_ogunler_delete on public.serbest_ogunler
  for delete to authenticated using (true);

-- ---------- ogun_kaydet: mükerrer engeli ----------
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
  v_ad text; v_tx uuid; v_kalan numeric; v_gun date;
begin
  v_gun := coalesce(p_tarih, current_date);

  select * into v_ogr from public.students where id = p_student_id;
  if not found then raise exception 'Öğrenci bulunamadı.'; end if;
  if not v_ogr.aktif then
    raise exception 'Bu öğrenci pasif durumda, işlem yapılamaz.';
  end if;

  -- Aynı güne ikinci yemek kaydı yasak
  if exists (select 1 from public.transactions t
             where t.student_id = p_student_id
               and t.tip = 'harcama'
               and t.tarih = v_gun) then
    raise exception '% için % tarihinde zaten yemek kaydı var. Aynı güne ikinci kayıt girilemez.',
      v_ogr.ad_soyad, to_char(v_gun, 'DD.MM.YYYY');
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
  values (p_student_id, v_gun, 'harcama', v_tutar,
          coalesce(nullif(btrim(p_aciklama), ''), v_ad || ' yemek'),
          auth.uid(), p_ogun_tipi)
  returning id into v_tx;

  select b.kalan into v_kalan from public.student_balances b where b.student_id = p_student_id;
  return query select v_tx, v_tutar, v_ad, v_kalan;
end;
$$;

grant execute on function public.ogun_kaydet(uuid, public.abone_tipi, date, text) to authenticated;

-- ---------- serbest_ogun_kaydet ----------
create or replace function public.serbest_ogun_kaydet(
  p_tip   public.serbest_ogun_tipi,
  p_tarih date default current_date
)
returns table (kayit_id uuid, tutar numeric, ogun_adi text,
               gun_adet bigint, gun_nakit numeric)
language plpgsql security invoker set search_path = public
as $$
declare
  v_ayar public.app_settings%rowtype;
  v_tutar numeric; v_ad text; v_id uuid; v_gun date;
  v_adet bigint; v_nakit numeric;
begin
  v_gun := coalesce(p_tarih, current_date);
  select * into v_ayar from public.app_settings where id = 1;

  if p_tip = 'ucretli' then
    v_ad := 'Ücretli';
    v_tutar := case when coalesce(v_ayar.ucretli_ogun_ucreti, 0) > 0
                    then v_ayar.ucretli_ogun_ucreti
                    else coalesce(v_ayar.taban_gunluk_ucret, 0) end;
    if v_tutar <= 0 then
      raise exception 'Ücretli öğün fiyatı tanımlı değil. Ayarlar sayfasından girin.';
    end if;
  else
    v_ad := 'Misafir';
    v_tutar := coalesce(v_ayar.misafir_ogun_ucreti, 0);
  end if;

  insert into public.serbest_ogunler (tarih, tip, tutar, aciklama, islemi_yapan_user_id)
  values (v_gun, p_tip, v_tutar, v_ad || ' öğün', auth.uid())
  returning id into v_id;

  select count(*), coalesce(sum(s.tutar) filter (where s.tip = 'ucretli'), 0)
    into v_adet, v_nakit
  from public.serbest_ogunler s where s.tarih = v_gun;

  return query select v_id, v_tutar, v_ad, v_adet, v_nakit;
end;
$$;

grant execute on function public.serbest_ogun_kaydet(public.serbest_ogun_tipi, date) to authenticated;

-- ---------- Gün sonu v2: serbest öğünler dahil ----------
drop function if exists public.rapor_gun_sonu(date, date, text);

create or replace function public.rapor_gun_sonu(
  p_baslangic date, p_bitis date, p_sinif text default null
)
returns table (
  tarih date, toplam_kisi bigint, ogrenci_kisi bigint,
  gunlukcu bigint, aylikci bigint, ucretli bigint, misafir bigint,
  ogrenci_tutari numeric, nakit_tutar numeric, toplam_tutar numeric
)
language sql stable set search_path = public
as $$
  with ogr as (
    select t.tarih,
      count(distinct t.student_id) as kisi,
      count(distinct t.student_id) filter (where s.abone_tipi = 'gunluk') as gunlukcu,
      count(distinct t.student_id) filter (where s.abone_tipi = 'aylik')  as aylikci,
      coalesce(sum(t.tutar), 0) as tutar
    from public.transactions t
    join public.students s on s.id = t.student_id
    where t.tip = 'harcama'
      and t.tarih between p_baslangic and p_bitis
      and (p_sinif is null or s.sinif = p_sinif)
    group by t.tarih
  ),
  serbest as (
    -- Serbest öğünler sınıfa bağlı değil; sınıf filtresi varsa dahil edilmez
    select o.tarih,
      count(*) filter (where o.tip = 'ucretli') as ucretli,
      count(*) filter (where o.tip = 'misafir') as misafir,
      coalesce(sum(o.tutar) filter (where o.tip = 'ucretli'), 0) as nakit,
      coalesce(sum(o.tutar), 0) as tutar
    from public.serbest_ogunler o
    where o.tarih between p_baslangic and p_bitis
      and p_sinif is null
    group by o.tarih
  ),
  gunler as (select tarih from ogr union select tarih from serbest)
  select
    g.tarih,
    (coalesce(o.kisi,0) + coalesce(sb.ucretli,0) + coalesce(sb.misafir,0))::bigint,
    coalesce(o.kisi, 0)::bigint,
    coalesce(o.gunlukcu, 0)::bigint,
    coalesce(o.aylikci, 0)::bigint,
    coalesce(sb.ucretli, 0)::bigint,
    coalesce(sb.misafir, 0)::bigint,
    coalesce(o.tutar, 0)::numeric(14,2),
    coalesce(sb.nakit, 0)::numeric(14,2),
    (coalesce(o.tutar,0) + coalesce(sb.tutar,0))::numeric(14,2)
  from gunler g
  left join ogr     o  on o.tarih  = g.tarih
  left join serbest sb on sb.tarih = g.tarih
  order by g.tarih desc;
$$;

grant execute on function public.rapor_gun_sonu(date, date, text) to authenticated;

-- ---------- Nakit raporu ----------
create or replace function public.rapor_nakit(
  p_baslangic date, p_bitis date
)
returns table (
  tarih date, ucretli_adet bigint, ucretli_nakit numeric,
  misafir_adet bigint, misafir_tutar numeric,
  tahsilat_adet bigint, tahsilat_tutar numeric, gun_toplami numeric
)
language sql stable set search_path = public
as $$
  with serbest as (
    select o.tarih,
      count(*) filter (where o.tip = 'ucretli') as u_adet,
      coalesce(sum(o.tutar) filter (where o.tip = 'ucretli'), 0) as u_tutar,
      count(*) filter (where o.tip = 'misafir') as m_adet,
      coalesce(sum(o.tutar) filter (where o.tip = 'misafir'), 0) as m_tutar
    from public.serbest_ogunler o
    where o.tarih between p_baslangic and p_bitis
    group by o.tarih
  ),
  tahsilat as (
    select t.tarih, count(*) as adet, coalesce(sum(t.tutar), 0) as tutar
    from public.transactions t
    where t.tip = 'tahsilat' and t.tarih between p_baslangic and p_bitis
    group by t.tarih
  ),
  gunler as (select tarih from serbest union select tarih from tahsilat)
  select
    g.tarih,
    coalesce(s.u_adet, 0)::bigint,
    coalesce(s.u_tutar, 0)::numeric(14,2),
    coalesce(s.m_adet, 0)::bigint,
    coalesce(s.m_tutar, 0)::numeric(14,2),
    coalesce(t.adet, 0)::bigint,
    coalesce(t.tutar, 0)::numeric(14,2),
    (coalesce(s.u_tutar,0) + coalesce(t.tutar,0))::numeric(14,2)
  from gunler g
  left join serbest  s on s.tarih = g.tarih
  left join tahsilat t on t.tarih = g.tarih
  order by g.tarih desc;
$$;

grant execute on function public.rapor_nakit(date, date) to authenticated;

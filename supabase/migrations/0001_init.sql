-- =============================================================
-- 0001_init.sql — Tablolar, enum'lar ve temel trigger'lar
-- =============================================================

create extension if not exists pgcrypto;

-- ---------- Enum'lar ----------
do $$ begin
  create type public.user_rol as enum ('admin', 'personel');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_tipi as enum ('tahsilat', 'harcama');
exception when duplicate_object then null; end $$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  rol         public.user_rol not null default 'personel',
  ad_soyad    text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- app_settings (tek satırlık ayar tablosu) ----------
create table if not exists public.app_settings (
  id                 int primary key default 1,
  taban_gunluk_ucret numeric(12, 2) not null default 0,
  updated_at         timestamptz not null default now(),
  constraint app_settings_tek_satir check (id = 1)
);

insert into public.app_settings (id, taban_gunluk_ucret)
values (1, 0)
on conflict (id) do nothing;

-- ---------- students ----------
create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  ogrenci_no     text not null unique,
  ad_soyad       text not null,
  sinif          text,
  kimlik_no      text,
  veli_adi       text,
  veli_telefon   text,
  iskonto_orani  numeric(5, 2) not null default 0 check (iskonto_orani >= 0 and iskonto_orani <= 100),
  iskonto_tutar  numeric(12, 2) not null default 0 check (iskonto_tutar >= 0),
  devir          numeric(14, 2) not null default 0,
  aktif          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists students_ad_soyad_idx on public.students (ad_soyad);
create index if not exists students_sinif_idx on public.students (sinif);
create index if not exists students_aktif_idx on public.students (aktif);

-- ---------- transactions ----------
create table if not exists public.transactions (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references public.students (id) on delete cascade,
  tarih                 date not null default current_date,
  tip                   public.transaction_tipi not null,
  tutar                 numeric(12, 2) not null check (tutar > 0),
  aciklama              text,
  islemi_yapan_user_id  uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now()
);

create index if not exists transactions_student_idx on public.transactions (student_id);
create index if not exists transactions_tarih_idx on public.transactions (tarih);
create index if not exists transactions_tip_idx on public.transactions (tip);

-- ---------- audit_log ----------
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  tarih       timestamptz not null default now(),
  islem_tipi  text not null,
  tablo_adi   text not null,
  kayit_id    uuid,
  eski_deger  jsonb,
  yeni_deger  jsonb
);

create index if not exists audit_log_tarih_idx on public.audit_log (tarih desc);
create index if not exists audit_log_tablo_idx on public.audit_log (tablo_adi);

-- =============================================================
-- Trigger'lar
-- =============================================================

-- updated_at otomatik güncelleme
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Yeni auth kullanıcısı -> profiles satırı
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, ad_soyad, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'ad_soyad', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'rol', '')::public.user_rol, 'personel')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Audit log trigger'ı: UPDATE ve DELETE işlemlerini otomatik kaydeder
create or replace function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old   jsonb;
  v_new   jsonb;
  v_id    text;
  v_uuid  uuid;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_new := null;
    v_id  := v_old ->> 'id';
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_id  := v_new ->> 'id';
  end if;

  -- app_settings gibi uuid olmayan PK'lerde kayit_id null bırakılır
  begin
    v_uuid := v_id::uuid;
  exception when others then
    v_uuid := null;
  end;

  insert into public.audit_log (user_id, islem_tipi, tablo_adi, kayit_id, eski_deger, yeni_deger)
  values (auth.uid(), lower(tg_op), tg_table_name, v_uuid, v_old, v_new);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists students_audit on public.students;
create trigger students_audit
  after update or delete on public.students
  for each row execute function public.log_audit();

drop trigger if exists transactions_audit on public.transactions;
create trigger transactions_audit
  after update or delete on public.transactions
  for each row execute function public.log_audit();

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit
  after update or delete on public.profiles
  for each row execute function public.log_audit();

drop trigger if exists app_settings_audit on public.app_settings;
create trigger app_settings_audit
  after update on public.app_settings
  for each row execute function public.log_audit();

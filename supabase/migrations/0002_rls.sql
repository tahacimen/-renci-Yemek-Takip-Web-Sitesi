-- =============================================================
-- 0002_rls.sql — Row Level Security politikaları
--
-- Kural özeti:
--   students      : SELECT herkes(auth), INSERT/UPDATE/DELETE sadece admin
--   transactions  : SELECT herkes(auth), INSERT admin+personel,
--                   UPDATE/DELETE sadece admin
--   app_settings  : SELECT herkes(auth), UPDATE sadece admin
--   profiles      : SELECT kendi satırı veya admin, yazma sadece admin
--   audit_log     : SELECT sadece admin, doğrudan yazma yok (trigger yazar)
-- =============================================================

-- Rol kontrolü için yardımcı fonksiyon.
-- SECURITY DEFINER: profiles üzerindeki RLS ile sonsuz döngüye girmemek için.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rol = 'admin'
  );
$$;

create or replace function public.current_rol()
returns public.user_rol
language sql
stable
security definer
set search_path = public
as $$
  select p.rol from public.profiles p where p.id = auth.uid();
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.current_rol() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_rol() to authenticated;

-- ---------- RLS aç ----------
alter table public.profiles     enable row level security;
alter table public.students     enable row level security;
alter table public.transactions enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_log    enable row level security;

-- anon rolüne hiçbir tabloda erişim verilmiyor
revoke all on public.profiles, public.students, public.transactions,
              public.app_settings, public.audit_log from anon;

-- =============================================================
-- profiles
-- =============================================================
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- =============================================================
-- students
-- =============================================================
drop policy if exists students_select on public.students;
create policy students_select on public.students
  for select to authenticated
  using (true);

drop policy if exists students_insert_admin on public.students;
create policy students_insert_admin on public.students
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists students_update_admin on public.students;
create policy students_update_admin on public.students
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- students DELETE yalnızca admin
drop policy if exists students_delete_admin on public.students;
create policy students_delete_admin on public.students
  for delete to authenticated
  using (public.is_admin());

-- =============================================================
-- transactions
--   personel INSERT yapabilir, UPDATE/DELETE YAPAMAZ.
--   Bu kural burada — veritabanı seviyesinde — zorlanır.
-- =============================================================
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
  for select to authenticated
  using (true);

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions
  for insert to authenticated
  with check (
    public.current_rol() in ('admin', 'personel')
    -- kaydı başkasının üzerine yazamasın
    and islemi_yapan_user_id = auth.uid()
  );

drop policy if exists transactions_update_admin on public.transactions;
create policy transactions_update_admin on public.transactions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists transactions_delete_admin on public.transactions;
create policy transactions_delete_admin on public.transactions
  for delete to authenticated
  using (public.is_admin());

-- =============================================================
-- app_settings
-- =============================================================
drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select to authenticated
  using (true);

drop policy if exists app_settings_update_admin on public.app_settings;
create policy app_settings_update_admin on public.app_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- audit_log — sadece admin okuyabilir; uygulama katmanından yazılamaz.
-- Kayıtları SECURITY DEFINER olan log_audit() trigger'ı düşer.
-- =============================================================
drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using (public.is_admin());

revoke insert, update, delete on public.audit_log from authenticated;

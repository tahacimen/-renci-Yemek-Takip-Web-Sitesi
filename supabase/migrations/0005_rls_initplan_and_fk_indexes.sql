-- =============================================================
-- 0005_rls_initplan_and_fk_indexes.sql
--
-- Supabase performance advisor bulguları.
-- Politika değişikliği sonrası 18 RLS senaryosu yeniden çalıştırıldı,
-- davranış birebir aynı kaldı.
-- =============================================================

-- 1) Foreign key'ler için kapsayıcı indeks (lint: unindexed_foreign_keys)
create index if not exists audit_log_user_idx
  on public.audit_log (user_id);
create index if not exists transactions_islemi_yapan_idx
  on public.transactions (islemi_yapan_user_id);

-- 2) lint: auth_rls_initplan
--    auth.uid() / is_admin() / current_rol() politikada doğrudan çağrıldığında
--    Postgres bunları HER SATIR için yeniden değerlendiriyordu. (select ...)
--    içine alınca sorgu başına bir kez çalışan bir InitPlan'e dönüşüyorlar.
--    Hepsi STABLE ve argümansız olduğu için sonuç değişmez.

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists students_insert_admin on public.students;
create policy students_insert_admin on public.students
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists students_update_admin on public.students;
create policy students_update_admin on public.students
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists students_delete_admin on public.students;
create policy students_delete_admin on public.students
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions
  for insert to authenticated
  with check (
    (select public.current_rol()) in ('admin', 'personel')
    and islemi_yapan_user_id = (select auth.uid())
  );

drop policy if exists transactions_update_admin on public.transactions;
create policy transactions_update_admin on public.transactions
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists transactions_delete_admin on public.transactions;
create policy transactions_delete_admin on public.transactions
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists app_settings_update_admin on public.app_settings;
create policy app_settings_update_admin on public.app_settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using ((select public.is_admin()));

-- =============================================================
-- 0007_rol_ayrimi_kaldirildi.sql
--
-- Rol ayrımı kaldırıldı: admin ve personel aynı yetkilere sahip.
--
-- `profiles.rol` alanı ve is_admin()/current_rol() fonksiyonları yerinde
-- bırakıldı. Ayrımı geri getirmek için:
--   1. src/lib/auth.ts içindeki ROL_AYRIMI_AKTIF = true yapın,
--   2. 0002 ve 0005 numaralı migration'lardaki politikaları tekrar uygulayın.
-- Yalnızca bayrağı çevirmek YETMEZ — asıl kontrol buradaki RLS'tedir.
--
-- Korunan iki kural (bunlar rol ayrımı değil, veri bütünlüğü):
--   * transactions.islemi_yapan_user_id = auth.uid()
--     -> kimse başkasının adına kayıt giremez, audit izi anlamını korur
--   * audit_log'a uygulamadan yazılamaz/silinemez
--     -> yalnızca SECURITY DEFINER trigger yazar
-- =============================================================

------------------------------------------------------------------ students
drop policy if exists students_insert       on public.students;
drop policy if exists students_insert_admin on public.students;
drop policy if exists students_update_admin on public.students;
drop policy if exists students_delete_admin on public.students;

create policy students_insert on public.students
  for insert to authenticated with check (true);
create policy students_update on public.students
  for update to authenticated using (true) with check (true);
create policy students_delete on public.students
  for delete to authenticated using (true);

-------------------------------------------------------------- transactions
drop policy if exists transactions_insert       on public.transactions;
drop policy if exists transactions_update_admin on public.transactions;
drop policy if exists transactions_delete_admin on public.transactions;

create policy transactions_insert on public.transactions
  for insert to authenticated
  with check (islemi_yapan_user_id = (select auth.uid()));
create policy transactions_update on public.transactions
  for update to authenticated using (true) with check (true);
create policy transactions_delete on public.transactions
  for delete to authenticated using (true);

------------------------------------------------------------- app_settings
drop policy if exists app_settings_update_admin on public.app_settings;

create policy app_settings_update on public.app_settings
  for update to authenticated using (true) with check (true);

------------------------------------------------------------------ profiles
drop policy if exists profiles_select        on public.profiles;
drop policy if exists profiles_insert_admin  on public.profiles;
drop policy if exists profiles_update_admin  on public.profiles;
drop policy if exists profiles_delete_admin  on public.profiles;

create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_insert on public.profiles
  for insert to authenticated with check (true);
create policy profiles_update on public.profiles
  for update to authenticated using (true) with check (true);
create policy profiles_delete on public.profiles
  for delete to authenticated using (true);

----------------------------------------------------------------- audit_log
drop policy if exists audit_log_select_admin on public.audit_log;

create policy audit_log_select on public.audit_log
  for select to authenticated using (true);

revoke insert, update, delete on public.audit_log from authenticated;

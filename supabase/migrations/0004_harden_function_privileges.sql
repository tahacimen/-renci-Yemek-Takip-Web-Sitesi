-- =============================================================
-- 0004_harden_function_privileges.sql
--
-- Supabase database linter (advisor) bulgularının kapatılması.
-- Canlı projede doğrulandı: 10 uyarıdan 2'ye indi.
-- =============================================================

-- 1) search_path sabitleme (lint: function_search_path_mutable)
--    Diğer fonksiyonlarda zaten "set search_path = public" vardı;
--    bu ikisi atlanmıştı.
alter function public.set_updated_at() set search_path = public;
alter function public.hesapla_efektif_ucret(numeric, numeric, numeric)
  set search_path = public;

-- 2) Trigger fonksiyonları PostgREST'te /rest/v1/rpc/... olarak açılıyordu.
--    İkisi de SECURITY DEFINER olduğu için dışarıya kapatıyoruz.
--
--    Trigger'lar çalışmaya devam eder: PostgreSQL, EXECUTE yetkisini yalnızca
--    CREATE TRIGGER anında kontrol eder; tetiklenme anında yeniden bakmaz.
revoke all on function public.log_audit() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- 3) Rol yardımcıları giriş yapmamış kullanıcıya kapalı olsun.
--    (authenticated'ın EXECUTE yetkisi KALMALI — RLS politikaları bu
--    fonksiyonları çağırıyor. Advisor bunun için uyarı vermeye devam eder;
--    kasıtlıdır, fonksiyonlar yalnızca çağıranın kendi rolünü döndürür.)
revoke all on function public.is_admin() from anon;
revoke all on function public.current_rol() from anon;

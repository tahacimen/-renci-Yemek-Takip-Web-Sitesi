-- =============================================================
-- 0006_students_insert_personel.sql
--
-- Personelin de yeni öğrenci kaydedebilmesi (iskonto/devir hariç).
--
-- NOT: Bu migration 0007 tarafından geçersiz kılınmıştır — rol ayrımı
-- tamamen kaldırıldığı için students INSERT artık koşulsuz açık.
-- Geçmişin doğru kalması için dosya bırakıldı; ara bir yetki modeline
-- (personel kaydeder ama iskonto tanımlayamaz) dönmek isterseniz
-- buradaki politika hazır bir örnek.
-- =============================================================

drop policy if exists students_insert_admin on public.students;
drop policy if exists students_insert on public.students;

create policy students_insert on public.students
  for insert to authenticated
  with check (
    (select public.is_admin())
    or (
      (select public.current_rol()) = 'personel'
      and iskonto_orani = 0
      and iskonto_tutar = 0
      and devir = 0
    )
  );

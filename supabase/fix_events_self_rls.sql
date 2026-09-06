-- ============================================================
-- Fix: CTS บันทึก "คิวงานที่ลงเอง" (self-queue, id ขึ้นต้น SE-) ไม่ขึ้น
-- Repro: CTS (เช่น POP) เพิ่มคิวงานตัวเอง -> ขึ้นบนจอทันที -> toast "บันทึกไม่สำเร็จ
--   จะลองใหม่อัตโนมัติ" -> รีเฟรชแล้วคิวหาย (พิสูจน์ว่าไม่เคยถูกบันทึกขึ้นเซิร์ฟเวอร์จริง)
--
-- Root cause: supabase/rls.sql บรรทัด events_admin_write ให้ "for all" (insert/update/
--   delete) บนตาราง events เฉพาะ Admin เท่านั้น — แต่ index.html ออกแบบให้ CTS ทุกคนลงคิวงาน
--   ของตัวเอง/เพื่อนร่วมทีมได้เอง (evRow เก็บ client.src='SE' แยกจากงานกลาง MA ที่ src='EV')
--   -> saveEvents() upsert จาก client CTS โดน RLS ปฏิเสธ = Postgres 42501
--      (new row violates row-level security policy for table "events")
--   -> save() จับ error ทั่วไป โชว์ toast แล้ว setTimeout(save,1500) วนซ้ำตลอดไป เพราะเป็น
--      permission error ถาวร ไม่ใช่ error ชั่วคราวที่ retry แล้วผ่าน
--   -> load() รีเฟรชสร้าง state.selfEvents จาก DB ล้วนๆ -> แถวที่ไม่เคย insert ได้ก็หายไป
--
-- Fix: เพิ่ม policy อนุญาต authenticated (admin + CTS ที่ login) เขียนเฉพาะแถว self-queue
--   (client->>'src' = 'SE') งานกลาง MA (src='EV' หรือแถวเก่าที่ยังไม่มี client) ยังคง
--   Admin-only ผ่าน events_admin_write เดิม (permissive policies รวมกันด้วย OR)
--
-- ยังไม่ได้รัน — รันไฟล์นี้ใน Supabase SQL editor เพื่อแก้ปัญหาจริง
-- ============================================================
create policy "events_self_write_auth" on public.events
  for all using (auth.role() = 'authenticated' and (client->>'src') = 'SE')
  with check (auth.role() = 'authenticated' and (client->>'src') = 'SE');

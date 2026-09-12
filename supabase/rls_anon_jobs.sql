-- ============================================================
-- Fix: Sales (anon) เขียนคิวลงปฏิทินไม่ได้ -> save() ค้างที่ "ยังไม่ได้บันทึก — กำลังลองใหม่"
--
-- สาเหตุ: rls.sql ให้เขียน public.jobs ได้เฉพาะ authenticated (policy "jobs_write_auth")
--         แต่ Sales = anon ตามดีไซน์ (ไม่ต้อง login)
--         ตอน Sale กดส่งคำขอ แอปเขียนคิวลง jobs เพื่อ "ล็อกช่องเวลา" ไว้ทันที
--         -> RLS ปฏิเสธ (42501) -> save() throw ทุกครั้ง
--            ทั้งที่ requests / request_sessions / upc_days / upc_items บันทึกสำเร็จไปแล้ว
--
-- อาการที่เห็น:
--   1) ป้าย "⚠ ยังไม่ได้บันทึก — กำลังลองใหม่ (n)" วนไม่จบ ทั้งที่คำขอขึ้นระบบเรียบร้อย
--   2) ร้ายกว่านั้น: ช่องเวลาไม่ถูกล็อกบนเซิร์ฟเวอร์ -> โหลดใหม่แล้วช่องกลับมาว่าง = จองซ้ำได้
--
-- rls_anon_sales.sql เปิดให้ anon เขียน requests / request_sessions / upc_days / upc_items แล้ว
-- แต่ตกตาราง jobs ไป — ไฟล์นี้เติมให้ครบ
--
-- รันใน Supabase SQL Editor (รันซ้ำได้ ไม่เสียหาย)
-- ============================================================

drop policy if exists "jobs_write_anon" on public.jobs;
create policy "jobs_write_anon" on public.jobs
  for all using (auth.role() = 'anon')
  with check (auth.role() = 'anon');

-- ตรวจว่าขึ้นครบแล้ว: ต้องเห็น jobs_read_all / jobs_write_auth / jobs_write_anon
-- select policyname, cmd from pg_policies where tablename = 'jobs';

-- ============================================================
-- ⚠ หมายเหตุความปลอดภัย: anon เขียน jobs ได้ = ตามดีไซน์เดิมที่ Sales ไม่ต้อง login
--    (แนวเดียวกับ rls_anon_sales.sql) ถ้าวันหลังให้ Sales มีบัญชีจริง ค่อยถอด policy นี้ออก
-- ============================================================

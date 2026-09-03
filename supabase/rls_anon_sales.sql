-- ============================================================
-- Fix: Sales (anon) ส่ง/แก้คำขอได้ + คอลัมน์ client ของ requests
-- สาเหตุ: RLS เดิมให้ anon อ่านได้แต่เขียนไม่ได้ (requests_insert_auth = ต้อง authenticated)
--        → Sales ส่งคำขอแล้ว saveReq fail 42501 → ไม่ persist → CTS ไม่เห็น ("Request ไม่เด้งมาหา CTS")
--        + requests ยังไม่มีคอลัมน์ client (schema.sql บรรทัด 158 ยังไม่ได้รัน)
--          → team/area/requesterId/sessions ไม่ถูกเก็บ
-- รันใน Supabase SQL Editor
-- ============================================================

-- 1) เพิ่มคอลัมน์ client ให้ requests (เก็บ team/area/requesterId/sessions ฯลฯ ที่ไม่มีคอลัมน์ของตัวเอง)
alter table public.requests add column if not exists client jsonb;

-- 2) ให้ anon (Sales) เขียน/แก้/ลบคำขอได้ (ตามดีไซน์ "Sales = anon ไม่ต้อง login")
create policy "requests_insert_anon" on public.requests
  for insert with check (auth.role() = 'anon');
create policy "requests_update_anon" on public.requests
  for update using (auth.role() = 'anon') with check (auth.role() = 'anon');
create policy "requests_delete_anon" on public.requests
  for delete using (auth.role() = 'anon');

-- 3) ตารางลูก (คำขอหลายวัน / UPC) — anon เขียนได้ (saveReq ลบแล้ว insert ใหม่)
create policy "req_sess_write_anon" on public.request_sessions
  for all using (auth.role() = 'anon') with check (auth.role() = 'anon');
create policy "upc_days_write_anon" on public.upc_days
  for all using (auth.role() = 'anon') with check (auth.role() = 'anon');
create policy "upc_items_write_anon" on public.upc_items
  for all using (auth.role() = 'anon') with check (auth.role() = 'anon');

-- ============================================================
-- ⚠️ หมายเหตุความปลอดภัย: anon เขียนได้ = ใครก็สร้างคำขอได้ (ตามดีไซน์ Sales=anon)
--    ถ้าอยากเข้มงวด ให้ Sales มีบัญชี login (RLS รอบสอง) — พูดคุยกันภายหลัง
-- ============================================================

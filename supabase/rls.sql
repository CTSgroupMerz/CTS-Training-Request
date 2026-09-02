-- ============================================================
-- CTS Training Request — RLS Policy (Phased)
-- รอบแรก: เปิด RLS สำหรับ admin + CTS 9 คน (authenticated)
--         Sales (anon) ยังเข้าได้เต็มตามเดิม — ยังไม่จำกัดพื้นที่
-- ⚠️ เปิด RLS แล้ว "authenticated" ต้อง login ก่อน (admin/CTS)
--    anon (Sales) ยังผ่านทุกอย่างเหมือนเดิม
-- ============================================================

-- ============ 1. เพิ่มคอลัมน์ Sales ใน profiles (เตรียมไว้ ใช้ทีหลัง) ============
alter table public.profiles add column if not exists sales_area text;
alter table public.profiles add column if not exists sales_code text;

-- ============ 2. บันทึกบทบาท helpers (เผื่อเพิ่ม policy ทีหลัง) ============
create or replace function public.my_role()
returns text language sql stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ============ 3. เปิด RLS ทุกตาราง ============
alter table public.profiles         enable row level security;
alter table public.sales_areas      enable row level security;
alter table public.sales_codes      enable row level security;
alter table public.teams            enable row level security;
alter table public.requests         enable row level security;
alter table public.request_sessions enable row level security;
alter table public.upc_days         enable row level security;
alter table public.upc_items        enable row level security;
alter table public.jobs             enable row level security;
alter table public.skills           enable row level security;
alter table public.holidays         enable row level security;
alter table public.events           enable row level security;

-- ============ 4. PROFILES ============
-- ทุกคน (รวม anon) เห็น profiles ได้ (ชื่อ/ทีม/role — master data สำหรับแสดงผล)
create policy "profiles_read" on public.profiles
  for select using (true);
-- แก้ profile ได้เฉพาะเจ้าของ + admin
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (public.my_role() = 'Admin' or auth.uid() = id)
  with check (public.my_role() = 'Admin' or auth.uid() = id);

-- ============ 5. MASTER DATA (sales_areas, sales_codes, teams) — อ่านได้ทุกคน ============
create policy "teams_read" on public.teams for select using (true);
create policy "sales_areas_read" on public.sales_areas for select using (true);
create policy "sales_codes_read" on public.sales_codes for select using (true);

-- ============ 6. REQUESTS ============
-- อ่าน: ทุกคน (admin/CTS → เห็นหมด, anon/Sales → เห็นหมดตามเดิม (ยังไม่จำกัด))
create policy "requests_read_all" on public.requests
  for select using (true);
-- เขียน: เฉพาะ authenticated (admin + CTS) — Create/Update/Delete
create policy "requests_insert_auth" on public.requests
  for insert with check (auth.role() = 'authenticated');
create policy "requests_update_auth" on public.requests
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "requests_delete_auth" on public.requests
  for delete using (auth.role() = 'authenticated');

-- ============ 7. NESTED (request_sessions / upc_days / upc_items) ============
-- อ่านทุกคน / เขียนตาม parent (auth) — เหมือน requests
create policy "req_sess_read" on public.request_sessions for select using (true);
create policy "req_sess_write" on public.request_sessions
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "upc_days_read" on public.upc_days for select using (true);
create policy "upc_days_write" on public.upc_days
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "upc_items_read" on public.upc_items for select using (true);
create policy "upc_items_write" on public.upc_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============ 8. JOBS (ปฏิทินงาน) ============
-- อ่านทุกคน (admin/CTS/anon ดูคิวว่างได้) / เขียนเฉพาะ auth
create policy "jobs_read_all" on public.jobs for select using (true);
create policy "jobs_write_auth" on public.jobs
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============ 9. SKILLS (master) ============
create policy "skills_read" on public.skills for select using (true);
create policy "skills_admin_write" on public.skills
  for all using (public.my_role() = 'Admin')
  with check (public.my_role() = 'Admin');

-- ============ 10. HOLIDAYS ============
create policy "holidays_read" on public.holidays for select using (true);
create policy "holidays_admin_write" on public.holidays
  for all using (public.my_role() = 'Admin')
  with check (public.my_role() = 'Admin');

-- ============ 11. EVENTS ============
create policy "events_read" on public.events for select using (true);
create policy "events_admin_write" on public.events
  for all using (public.my_role() = 'Admin')
  with check (public.my_role() = 'Admin');

-- ============================================================
-- ✅ สรุปสิทธิ์ (รอบนี้):
--   Client ที่ LOGIN (admin + CTS 9 คน) → เขียนได้ (requests/jobs/skills/holidays/events)
--   anon (Sales) → อ่านได้ทุกอย่าง (ยังไม่จำกัดพื้นที่ — ทำเฟสหลัง)
--   Admin เท่านั้น → แก้ master data (skills/holidays/events) + profile
-- ============================================================

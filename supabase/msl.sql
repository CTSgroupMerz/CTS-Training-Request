-- msl_events: ปฏิทินคิวงานของทีม MSL (แยกจาก CTS ทั้งหมด ไม่ผูกกับ Sale)
-- ทั้งคิวเก็บใน data (jsonb) — เผื่อช่องนับ KPI ที่จะกำหนดทีหลัง ไม่ต้องแก้ตารางอีก
-- รันใน Supabase SQL Editor ครั้งเดียว
--
-- ผู้ใช้ MSL 9 คน สร้างที่ Authentication → Users → Add user (ติ๊ก Auto Confirm User):
--   msl-pearl@ctsgroup.merz.com   msl-koi@ctsgroup.merz.com     msl-up@ctsgroup.merz.com
--   msl-fern@ctsgroup.merz.com    msl-pam@ctsgroup.merz.com     msl-tudtu@ctsgroup.merz.com
--   msl-itim@ctsgroup.merz.com    msl-kaimook@ctsgroup.merz.com msl-bozo@ctsgroup.merz.com
begin;
create table if not exists public.msl_events (
  id text primary key,
  date date not null,
  date_end date not null,
  data jsonb not null,
  updated_at timestamptz default now()
);
create index if not exists msl_events_date on public.msl_events (date);
alter table public.msl_events enable row level security;

-- อ่าน: ทุกคนที่ล็อกอิน (MSL / CTS / Admin)
drop policy if exists "msl_read" on public.msl_events;
create policy "msl_read" on public.msl_events for select using (auth.role() = 'authenticated');

-- เขียน/ลบ: เฉพาะบัญชี MSL (อีเมลขึ้นต้น msl-) และ Admin
drop policy if exists "msl_write" on public.msl_events;
create policy "msl_write" on public.msl_events for all
  using ((auth.jwt() ->> 'email') like 'msl-%' or public.my_role() = 'Admin')
  with check ((auth.jwt() ->> 'email') like 'msl-%' or public.my_role() = 'Admin');
commit;

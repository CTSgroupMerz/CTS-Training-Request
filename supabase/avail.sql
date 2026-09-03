-- avail: ช่วงเวลาที่ Admin/CTS แก้เอง (override auto-window) — ย้ายจากแท็บ _state ให้ persist
-- ข้อมูลเดิม: 2026-08-28 koollanut pm = 15:00-18:00 (ค่าเดียวที่มี) · 2026-10-26 narakamon เป็น null (ไม่เก็บ)
-- รันใน Supabase SQL Editor
begin;
create table if not exists public.avail (
  id bigint generated always as identity primary key,
  date date not null,
  cts_id text not null references public.profiles(member_id),
  slot text not null check (slot in ('am','pm')),
  start text,
  end_time text,
  closed boolean default false,
  unique(date, cts_id, slot)
);
alter table public.avail enable row level security;
create policy "avail_read" on public.avail for select using (true);
create policy "avail_write_auth" on public.avail for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- seed จากของเดิม
insert into public.avail (date, cts_id, slot, start, end_time, closed)
values ('2026-08-28','koollanut','pm','15:00','18:00',false)
on conflict (date, cts_id, slot) do update set start=excluded.start, end_time=excluded.end_time, closed=excluded.closed;
commit;

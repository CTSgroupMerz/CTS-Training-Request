-- CTS Training Request — Supabase Schema
-- สร้างจากโค้ดจริง (Code.gs + index.html) — รันใน Supabase SQL Editor (หรือ supabase db push)
-- ออกแบบเผื่อ 60 คนในอนาคต (profiles เพิ่มแถวได้เรื่อยๆ)

-- ============ 1. PROFILES — คนใช้ (login รายคน) ============
-- ต่อจาก auth.users (Supabase Auth) — email/password login รายคน
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  member_id text unique,          -- 'parichat', 'witchukorn', 'admin' ฯลฯ
  name text not null,
  nick text,
  team text check (team in ('A','B','SUP')) default 'A',
  role text check (role in ('Senior Leader','Senior','CTS','Supervisor','Admin')) default 'CTS',
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ 2. SALES AREAS — พื้นที่ขาย (no-login anon) ============
create table if not exists public.sales_areas (
  id bigint generated always as identity primary key,
  area text not null unique,      -- 'Champion','Victory','KAE4','Winner','KAE1','KAE2','KAE3','UPC'
  team text check (team in ('A','B','BOTH')) default 'A'
);

create table if not exists public.sales_codes (
  id bigint generated always as identity primary key,
  area text not null references public.sales_areas(area) on delete cascade,
  code text not null,             -- 'C01','V01','UPC1' ฯลฯ
  unique(area, code)
);

-- ============ 3. TEAMS — ทีม + ผู้นำ + คนจองได้ ============
create table if not exists public.teams (
  id text primary key,            -- 'A','B','SUP'
  lead_member_id text,            -- 'parichat' (PAM)
  junior_lead_member_id text,     -- 'kanwara' (MILK)
  bookable_member_ids text[] default '{}',
  CONSTRAINT fk_lead_member foreign key(lead_member_id) references public.profiles(member_id),
  CONSTRAINT fk_jr_lead foreign key(junior_lead_member_id) references public.profiles(member_id)
);

-- ============ 4. REQUESTS — คำขอเทรน (normal mode) ============
create table if not exists public.requests (
  id text primary key,            -- 'TR1041'
  mode text not null default 'normal' check (mode in ('normal','upc')),
  status text not null default 'pending'
    check (status in ('pending','approved','tbc','rejected','cancelled')),
  module text,                    -- 'MAX-Entry','MAX-A','MAX-B'
  level text,                     -- 'Standard','Advance'
  products text[] default '{}',   -- multi-product
  topic text,
  clinic text,
  map_url text,
  doctors int,
  exp text,
  hands_on boolean default false,
  ho_product text,
  ho_cases int,
  requester text,                 -- ชื่อผู้ขอ (กรอกเอง / sales)
  requester_profile_id uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ 5. REQUEST SESSIONS — session ของคำขอ (normal) ============
create table if not exists public.request_sessions (
  id bigint generated always as identity primary key,
  request_id text not null references public.requests(id) on delete cascade,
  date date not null,
  slot text check (slot in ('am','pm','day')) default 'day',
  start text,                     -- '09:00' (แก้ไขได้)
  end_time text,                  -- '12:00'
  cts_id text references public.profiles(member_id),  -- จัดให้ใคร
  product text,
  topic text,
  full_day boolean default false
);
create index if not exists idx_req_sess_request on public.request_sessions(request_id);
create index if not exists idx_req_sess_date on public.request_sessions(date);

-- ============ 6. UPC DAYS — วันเดินทาง (upc mode) ============
create table if not exists public.upc_days (
  id bigint generated always as identity primary key,
  request_id text not null references public.requests(id) on delete cascade,
  date date not null,
  cts_id text references public.profiles(member_id)
);
create index if not exists idx_upc_day_request on public.upc_days(request_id);

-- ============ 7. UPC ITEMS — session รายวันของ UPC ============
create table if not exists public.upc_items (
  id bigint generated always as identity primary key,
  upc_day_id bigint not null references public.upc_days(id) on delete cascade,
  clinic text,
  province text,
  module text,
  level text,
  product text,
  topic text,
  doctors text,
  exp text,
  hands_on boolean default false,
  ho_product text,
  ho_cases int
);

-- ============ 8. JOBS — ปฏิทินงาน (ตารางงาน) ============
create table if not exists public.jobs (
  id bigint generated always as identity primary key,
  date date not null,
  cts_id text not null references public.profiles(member_id),
  slot text check (slot in ('am','pm')),
  start text,
  end_time text,
  title text,
  product text,
  kind text check (kind in ('booked','pend','tbc','busy','event')) default 'booked',
  req_id text,                    -- อ้างถึง request (อ่านเร็ว)
  attendees text[] default '{}',
  source text default 'manual' check (source in ('auto','manual','event'))
);
create index if not exists idx_jobs_date_cts on public.jobs(date, cts_id, slot);

-- ============ 9. SKILLS — ทักษะ CTS ต่อ product ============
create table if not exists public.skills (
  cts_id text not null references public.profiles(member_id),
  product text not null,
  mode text check (mode in ('self','senior')),
  primary key(cts_id, product)
);

-- ============ 10. HOLIDAYS — วันหยุด ============
create table if not exists public.holidays (
  date date primary key,
  name text
);

-- ============ 11. EVENTS — event ปฏิทิน ============
create table if not exists public.events (
  id bigint generated always as identity primary key,
  date date,
  slot text check (slot in ('am','pm','all')) default 'all',
  cts text[] default '{all}',
  title text,
  detail text,
  product text,
  topics text[] default '{}'
);

-- ============ 12. REQUESTS.CLIENT — ฟิลด์ฝั่งหน้าจอที่ยังไม่มีคอลัมน์ ============
-- เฟส 1: index.html มีฟิลด์ที่ schema ยังไม่ได้ออกแบบไว้ (team, area, requesterId, byRole,
-- tbc/tbcAt/tbcOk, note, photos, missingAtApproval, dateFrom/dateTo, emailOk ราย session)
-- เก็บรวมไว้ที่นี่เพื่อไม่ให้ข้อมูลหายตอน round-trip · คอลัมน์จริงยังเป็นตัวหลักสำหรับ query/report/RLS
-- ไม่รันบรรทัดนี้แอปก็ยังทำงาน แต่ฟิลด์ข้างบนจะหายทุกครั้งที่โหลดใหม่
alter table public.requests add column if not exists client jsonb;

-- ============ 13. EVENTS.CLIENT + id ที่ฝั่งหน้าจอกำหนดเอง (เฟส 3) ============
-- events เก็บ 2 อย่างในตารางเดียว: งานกลาง MA (state.events) + คิวงานที่ CTS ลงเอง (state.selfEvents)
-- ฟิลด์ที่ยังไม่มีคอลัมน์ (type, allDay, start/end, dateEnd, owner, attendees, src) เก็บรวมใน client jsonb
-- id: หน้าจอกำหนดเอง (EV n -> n, SE n -> 1000000+n) จึง upsert on_conflict=id ได้ ไม่เจอ 409
-- ไม่รัน 2 บรรทัดนี้: งานกลาง/คิวงานที่ลงเองจะบันทึกไม่ขึ้น (ส่วนอื่นยังทำงานปกติ)
alter table public.events add column if not exists client jsonb;
alter table public.events alter column id set generated by default;

-- ============ RLS (Row-Level Security) ============
-- ทุกตาราง locked by default — เปิดเฉพาะที่จำเป็นใน seed/fix ภายหลัง
-- (ทำหลัง implement: authenticated เห็นได้ตาม team, anon = Sales เห็นเฉพาะพื้นที่ตัวเอง)

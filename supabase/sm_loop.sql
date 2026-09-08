-- ============================================================
-- SM Loop (Sales Manager) — ขยายสถานะคำขอให้รองรับ chain 4 ขั้น
-- Sale -> SM -> CTS Senior Leader -> CTS Manager
-- รันใน Supabase SQL Editor (รันซ้ำได้ ไม่เสียหาย)
-- ============================================================

-- สถานะใหม่ 2 ตัว:
--   'sm'  = รอ Sales Manager พิจารณา (ขั้นแรกของคำขอปกติ)
--   'mgr' = SM + Senior Leader ผ่านแล้ว รอ CTS Manager (BELLE) อนุมัติขั้นสุดท้าย
-- 'pending' คงความหมายเดิม = รอ CTS Senior Leader (PAM/MILK) จัด CTS + อนุมัติ
alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests add constraint requests_status_check
  check (status in ('pending','approved','tbc','rejected','cancelled','sm','mgr'));

-- audit trail (ใครกด Approve/Reject เมื่อไหร่) เก็บใน requests.client->'trail'
-- ไม่ต้องสร้างตารางใหม่ — client jsonb มีอยู่แล้วและ save() ส่งขึ้นให้อัตโนมัติ
-- index ช่วยให้ค้นรหัส/คลินิกใน Record เร็วเมื่อคำขอเยอะขึ้น
create index if not exists idx_requests_clinic on public.requests (clinic);

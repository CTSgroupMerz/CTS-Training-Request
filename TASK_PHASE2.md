# เฟส 2: แก้ index.html → ให้ sched (ปฏิทินงาน) อ่าน/เขียนผ่านตาราง `jobs` ใน Supabase

## งานชิ้นนี้คืออะไร
ต่อจากเฟส 1 (requests + auth เสร็จแล้ว) — ย้าย **ปฏิทินงาน (state.sched)** จาก state ก้อนเดียว
ไปยังตาราง `jobs` ของ Supabase (relational). **ยังห้ามแตะ skills/holidays/events** (เฟส 3)

## อ่านก่อน
- `SUPABASE_MIGRATION.md` + `supabase/schema.sql` — schema + auth
- `index.html` — ไฟล์ที่แก้ (เฟส 1 เสร็จแล้ว อย่าทำลายส่วนนั้น)
- `TASK_PHASE1.md` — ดูวิธีที่เฟสก่อนทำ (ทำตามรูปแบบเดียวกัน)

## ทำความเข้าใจโครงสร้าง sched ก่อน (จากโค้ด)
`state.sched` เป็น:
```js
state.sched[date][ctsId] = { am: job|null, pm: job|null }
// job = { kind, title, product, reqId, selfId, allDay, attendees[], start, end, ... }
```
- `setJob(k,cid,slot,job)` (บรรทัด ~1101) = จุดหลักที่เขียนคิว — **ทุกที่เรียกผ่านนี้**
- `jobOf(k,cid,slot)` (~1091) = อ่านคิวกลับ

## ขอบเขตที่ให้ทำ (เฟส 2 เท่านั้น)

### 1. `load()`: อ่าน jobs จาก Supabase → rebuild `state.sched`
- SELECT จาก `jobs` (date, cts_id, slot, start, end_time, title, product, kind, req_id, attendees)
- เปลี่ยนกลับเป็น nested `state.sched[date][ctsId][slot]` ทรงเดิม
- `start`/`end_time` → นำกลับเป็น job.start/job.end

### 2. `save()`: เขียน jobs ลง Supabase
- เมื่อ `setJob` ถูกเรียก → Upsert แถวใน `jobs` (INSERT ... ON CONFLICT id DO UPDATE)
- `jobs.id` เป็น identity (generated) — ใช้ Upsert ด้วย unique key (date, cts_id, slot)
- ลบ job (คืนว่าง) → DELETE แถวที่ตรง (date, cts_id, slot)

### 3. ไม่แตะ requests/auth (เฟส 1 แล้ว)
- `state.requests` ยังถูกจัดการโดยเฟส 1 — อย่าแก้
- `state.sched` แปลงจาก DB — แต่อย่าลบ logic `setJob` เดิม (ยังใช้คำนวณใน UI)

## ข้อมูล Supabase (ใช้ค่านี้ เหมือนเฟส 1)
- URL: `https://hxiswcnoxboegudstyng.supabase.co`
- anon key: `sb_publishable_rDKTTwBvD6GE4DoUeM0O6w_IPPZiVHr`

## ข้อควรระวัง
1. คอลัมน์ `end` เป็น keyword — ใช้ `end_time`
2. `jobs.cts_id` FK → `profiles.member_id` — ใช้ member_id (parichat ฯลฯ) ไม่ใช่ name
3. `state.sched` ซ้อนลึก (date→ctsId→slot) — map DB flat rows → nested อย่างระวัง
4. ไม่ลบ `setJob`/`jobOf` (UI ยังใช้คำนวณ) — แค่เปลี่ยนชั้น save/load
5. path ใช้ `C:/Users/...` (ไม่ใช่ `/c/Users/...`)

## Definition of Done (เฟส 2)
- [ ] `load()` อ่าน jobs จาก Supabase → calendar แสดงคิวจริง (854 แถวเดิม)
- [ ] `save()` เขียน/ลบ job ลง DB ทดสอบ (สร้าง/ย้าย/ลบ 1 คิว แล้วเห็นใน DB)
- [ ] แอปเปิดได้ ไม่ crash (พร้อมเฟส 1 ที่ทำไว้)
- [ ] ไม่แตะ skills/holidays/events

## เช็คก่อนส่ง (สำคัญ)
- [ ] เฟส 1 (requests + auth) ยังทำงาน — อย่าทำลาย
- [ ] jobs 854 แถวเดิม — ไม่หาย (load แล้ว counting ตรง)

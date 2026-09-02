# เฟส 3: แก้ index.html → ให้ skills / holidays / events / selfEvents ย้ายเข้า Supabase

## งานชิ้นนี้คืออะไร
เฟสสุดท้ายของ data migration — ย้าย 3 segment ที่เหลือจาก state ก้อนเดียวไปตารางจริง:
- `state.skills` → ตาราง `skills`
- `state.holidays` → ตาราง `holidays`
- `state.events` + `state.selfEvents` → ตาราง `events`

(เฟส 1 : requests/auth เสร็จ, เฟส 2 : sched/jobs เสร็จ — อย่าทำลายทั้งสอง)

## อ่านก่อน
- `SUPABASE_MIGRATION.md` + `supabase/schema.sql` — schema จริง
- `index.html` — ไฟล์ที่แก้ (เฟส 1-2 เสร็จแล้ว)
- `TASK_PHASE2.md` — ดูวิธีที่เฟสก่อนทำ (map array → ตาราง, upsert/delete)

## ทำความเข้าใจโครงสร้าง (จากโค้ด)

### `state.skills` (บรรทัด ~846-852)
```js
state.skills[ctsId][product] = 'self' | 'senior'   // nested 2 ชั้น
skillOf(cid,prod) => (state.skills[cid]||{})[prod]||null
```
→ ตาราง `skills(cts_id, product, mode)` — PK (cts_id, product)

### `state.holidays` (บรรทัด ~911, 952, 1483)
```js
state.holidays = [ {date:'2026-07-28', name:'วัน...'}, ... ]   // array of objects
holidayOf(k) => state.holidays.find(h=>h.date===k)
```
→ ตาราง `holidays(date PK, name)` — Admin แก้/ลบได้ (ดู add/remove ทั้ง 1483)

### `state.events` / `state.selfEvents` (บรรทัด ~954, 1067, 1106, 1481)
```js
state.events = [ {id, date, slot, cts:['belle'|'all'], title, detail, product, topics[]}, ... ]
selfEvents = [ {id, ...} ]   // งานส่วนตัวที่ CTS เพิ่มเอง
```
→ ตาราง `events(id, date, slot, cts[], title, detail, product, topics[])`

## ขอบเขตที่ให้ทำ (เฟส 3 เท่านั้น)

### 1. `load()` — อ่านทั้ง 3 จาก Supabase
- `skills` → rebuild `state.skills[ctsId][product]`
- `holidays` → `state.holidays[]`
- `events` → `state.events[]` (และ selfEvents ให้ map id ประเภท)

### 2. `save()` — upsert/delete ต่อตาราง
- `skills`: upsert on (cts_id, product), delete เมื่อลบ
- `holidays`: upsert on date, delete เมื่อลบ
- `events`: upsert on id, delete เมื่อลบ
- **ใช้ `Prefer: resolution=merge-duplicates` + on_conflict** (เหมือนเฟส 3) — กัน 409

### 3. ไม่แตะ requests/auth (เฟส 1) + jobs (เฟส 2)

## ข้อมูล Supabase
- URL: `https://hxiswcnoxboegudstyng.supabase.co`
- anon key: `sb_publishable_rDKTTwBvD6GE4DoUeM0O6w_IPPZiVHr`

## ข้อควรระวัง
1. `events.cts[]` เป็น array text[] — ตอน insert ใช้ Jackson/JSON array
2. `holidays.date` PK — upsert on conflict date
3. `skills` PK (cts_id, product) — ต้องมี unique (ดูเพิ่มใน schema.sql ทั้งนี้ตารางมี PK แล้ว)
4. `selfEvents` เป็น id เฉพาะ — map ไป `events` ได้โดยใช้ source/id แยก
5. path ใช้ `C:/Users/...`

## Definition of Done (เฟส 3)
- [ ] `load()` อ่าน skills/holidays/events → state แสดงถูก
- [ ] `save()` upsert/delete ต่อตาราง — ทดสอบเพิ่ม/ลบ holiday แล้วเห็นใน DB
- [ ] แอปเปิด ไม่ crash (เฟส 1-2 ยัง работают)
- [ ] ไม่แตะ requests/jobs

## เช็คก่อนส่ง
- [ ] เฟส 1 (requests/auth) + เฟส 2 (jobs) ยังทำงาน
- [ ] เหลือ 3 segment: skills/holidays/events ครบ

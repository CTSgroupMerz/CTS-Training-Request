# เฟส 1: แก้ index.html → ให้อ่าน/เขียน requests ผ่าน Supabase (relational) + Supabase Auth

## งานชิ้นนี้คืออะไร
ใช้ซุ้มแอป GAS ที่หน้าจอ (index.html) ให้เริ่มใช้ **Supabase** แทน Google Apps Script,
เป็นส่วนแรกของ migration — เฉพาะข้อมูล "คำขอเทรน" (requests) + การ login.
**ยังห้ามแตะ** sched/skills/holidays/events (นั่นคือเฟส 2,3)

## อ่านก่อน
- `SUPABASE_MIGRATION.md` — สถาปัตยกรรม + schema + auth (ข้อมูลครบ)
- `supabase/schema.sql` — DDL จริงของทุกตาราง
- `index.html` — ไฟล์ที่ต้องแก้ (3629 บรรทัด)

## ขอบเขตที่ให้ทำ (เฟส 1 เท่านั้น)

### 1. แก้ auth: `signIn` (บรรทัด ~1243) + `restoreLogin` (~1263)
จาก: password ร่วม (`pw`) + localStorage
ไป: **Supabase Auth** `supabase.auth.signInWithPassword({email, password})`
- `auth` object เดิม (role/pw) ใช้ localStorage ได้ (เก็บ role ที่เลือก) — **แต่ password แยกไป Auth**
- `logout` ต้องเรียก `supabase.auth.signOut()`
- อย่าลืม: insert `<script>` ของ supabase-js (CDN) ที่ส่วน head

### 2. แก้ data (requests): `load()` (~3570) + `save()` (~3592)
จาก: ยัด `state` ก้อนเดียวไป `API` (GAS doPost)
ไป: **Supabase REST** ผ่าน supabase-js

**`load()`**: อ่าน `requests` จากตารางจริง + join (request_sessions / upc_days / upc_items)
→ rebuild `state.requests` + `state.feed` + `seq/evSeq/seSeq` (ตามโค้ดเดิมใน `apply`)

**`save()`**: **Upsert ราย request** (INSERT ... ON CONFLICT "id" DO UPDATE)
→ ไม่ rewrite ทั้งก้อน (แก้คอขวด 60 คน)
→ `state.sched/skills/holidays/events` ยังไม่ save (เฟส 2,3)

### 3. Constant `API` (บรรทัด 3496) — ปล่อยว่าง/เปลี่ยนเป็น Supabase client
ตอนนี้ `API` ชี้ไป GAS URL — ให้แทนด้วย supabase client (URL + anon key ด้านล่าง)

## ข้อมูล Supabase (ใช้ค่านี้)
- URL: `https://hxiswcnoxboegudstyng.supabase.co`
- anon/publishable key: `sb_publishable_rDKTTwBvD6GE4DoUeM0O6w_IPPZiVHr`
- ใช้ supabase-js (CDN) + `.from('requests').select('*')` ฯลฯ

## ข้อควรระวัง (จากจริง)
1. อย่าใช้ชื่อคอลัมน์ `end` (เป็น SQL keyword) — ใช้ `end_time`
2. FK: `requests.requester_profile_id` ต้องเป็น UUID ของ profile (อ่านจาก `profiles`)
3. `state` ยังเป็น single object — แตะเฉพาะ `requests`/`feed`/`seq` ในเฟส 1
4. path เมื่อรันผ่าน bash ใช้ `C:/Users/...` (ไม่ใช่ `/c/Users/...`)

## Definition of Done (เฟส 1)
- [ ] login ด้วย Supabase Auth ได้ (email/password จริง)
- [ ] `load()` อ่าน requests จาก Supabase ได้ (30 dummy ที่มีอยู่)
- [ ] `save()` upsert ราย request ผ่าน — ทดสอบสร้าง/แก้ 1 request แล้วเห็นใน DB
- [ ] แอปเปิดได้ ไม่ crash (โหมด offline ถ้า Supabase ใช้ไม่ได้ ยังแสดงผลได้)
- [ ] ไม่แตะ sched/skills/holidays/events (ยังเป็น state เดิม)

# CTS Training Request — Supabase Migration (FINAL STATUS)

> อัปเดต: 2026-09-08 — **ทุกเฟสเสร็จ + QA ผ่าน + RLS เปิด + Deploy GitHub Pages + SM Loop (อนุมัติ 4 ขั้น) + UI/UX รอบเก็บรายละเอียด ใช้งานจริงแล้ว**

---

## ✅ สรุปสถานะ — สำเร็จครบ

**ผลลัพธ์: แอป CTS Training Request ย้ายจาก Google Apps Script → Supabase ทำงานได้จริง + เปิดใช้บน GitHub Pages แล้ว**

| รายการ | สถานะ |
|---|---|
| Data migration (Phase 1-3) | ✅ เสร็จ |
| QA: login / load / CRUD | ✅ ผ่านครบ |
| RLS (security) | ✅ เปิดแล้ว (12 ตาราง) — verify anon อ่านได้/เขียนไม่ได้ |
| บั๊กคิวงานหายในปฏิทิน | ✅ แก้แล้ว (dayEntries อ่าน state.sched) |
| cache-bust (กันเปิดเวอร์ชันเก่า) | ✅ v2 deploy |
| GitHub Pages | ✅ `https://ctsgroupmerz.github.io/CTS-Training-Request/` |
| Push main | ✅ main ล่าสุด |
| **SM Loop — อนุมัติ 4 ขั้น + Record** | ✅ เสร็จ 2026-09-08 (`a4c9ee4`, `e3f3eab`) |
| **UI/UX รอบเก็บรายละเอียด (11 ข้อ)** | ✅ เสร็จ 2026-09-08 (`3459373`) — **ไม่มี SQL ต้องรัน** |

---

## 🏗️ Project

- **Project ref:** `hxiswcnoxboegudstyng`
- **URL:** `https://hxiswcnoxboegudstyng.supabase.co`
- **Region:** Singapore (ap-southeast-1)
- **Frontend:** `index.html` (SPA เดียว ใช้ supabase-js CDN)
- **Pages URL:** `https://ctsgroupmerz.github.io/CTS-Training-Request/`
- **Repo:** `github.com/CTSgroupMerz/CTS-Training-Request`

---

## 📊 Data (verify count จริง)

| ตาราง | ข้อมูล | หมายเหตุ |
|---|---|---|
| `profiles` | 10 (9 CTS + Admin) | ผูก UUID จริงจาก auth.users |
| `jobs` | 854 แถว | ย้ายจาก Google Sheet (ตารางงาน) — **คิวหลัก** |
| `requests` + nested | **0** | ลบ dummy (TR1041-1070) แล้ว — ตารางว่าง รอคำขอจริง |
| `request_sessions` / `upc_days` / `upc_items` | 0 / 0 / 0 | cascade ลบพร้อม dummy |
| `holidays` | 6 | seed |
| `sales_areas` / `sales_codes` | 8 / 21 | seed |
| `skills` / `events` / `avail` | ว่าง / **11+164** / **1** | **งานกลาง MA seed แล้ว (11, 649879c)** · **คิวงานที่ CTS ลงเอง seed แล้ว (164 = SE- → คืน 'แก้ไขเวลางาน' + แสดงทุกคน, seed_self_events.sql)** · skills รอ Admin เพิ่ม · **avail seed แล้ว (koollanut 28/8 pm 15:00–18:00) + load/save (2928c9d)** |

---

## ✅ Phase 1-3 — สรุป

| เฟส | เปลี่ยน | สถานะ |
|---|---|---|
| **1** | auth (Supabase Auth) + requests → ตาราง | ✅ |
| **2** | sched → `jobs` | ✅ (unique `jobs_unique_slot (date,cts_id,slot)`) |
| **3** | skills/holidays/events → ตาราง 3 ตัว | ✅ |

### ไฟล์ในโปรเจค
- `index.html` — `load()/save()/signIn()` → Supabase + `dayEntries()` อ่าน `state.sched` (jobs)
- `sw.js` — CACHE `cts-v2` (network-first, cache สำรอง offline)
- `supabase/schema.sql` / `seed.sql` / `rls.sql` / `seed_dummy_requests.py`
- `TASK_PHASE1-3.md` / `FIX_calendar_jobs.md` — task spec + บั๊กที่แก้
- `SUPABASE_MIGRATION.md` — เอกสารนี้

### Backup
- `Desktop/งานอีเบล/backup-CTS-20260902-2036/` — backup โปรเจค
- `Desktop/งานอีเบล/backup-before-frontend-20260902-2130/` — ก่อนแก้ frontend (ย้อนกลับ GAS ได้)

---

## ✅ QA + บั๊กที่แก้ (2026-09-03)

| รายการ | ผล |
|---|---|
| Login admin/cts111 | ✅ |
| `jobs` 854 ใน `state.sched` | ✅ 110 วัน |
| **บั๊ก: คิวงานไม่แสดงในปฏิทิน** | ✅ แก้แล้ว — `dayEntries()` ไม่อ่าน `state.sched` เดิมอ่านจาก `requests.sessions` → เพิ่มอ่านจาก `state.sched[date][ctsId]` |
| คิว render (OTOS/Belotero/Ultherapy/LEAVE) | ✅ 55 การ์ด + ไม่ซ้ำ (ข้าม reqId/selfId) |
| อนาคตคำขอ→คิวตามกฎเดิม | ✅ (ตรรกะเดิมยังอยู่) |
| check-cal.js | ✅ 36 ข้อผ่าน |

---

## ⏳ RLS — เปิดแล้ว

`rls.sql` รันผ่านแล้ว (12 ตาราง):
- **login (admin + CTS)**: อ่าน + เขียนได้
- **anon (Sales)**: อ่านได้ เขียนไม่ได้ (**ยังไม่จำกัดพื้นที่ Sales** — เฟสหลัง)
- **Admin**: แก้ master data (skills/holidays/events) + profile

---

## 📌 สิ่งที่เหลือ / TODO (งานค้าง)

### วันนี้เสร็จแล้ว: ✅ push + cache-bust + GitHub Pages

### ✅ เพิ่มเมื่อ 2026-09-08 — SM Loop (Sales Manager)

**เส้นทางอนุมัติใหม่:** `Sale → SM → CTS Senior Leader (PAM/MILK) → CTS Manager (BELLE)`
คิว TBC ยังไป Senior Leader ก่อนตามเดิม (ล็อกวัน) แล้วเข้าเส้นทางนี้ตอน Sales ยืนยันวัน

| สถานะคำขอ | ความหมาย |
|---|---|
| `sm` | รอ SM ของทีมนั้นพิจารณา (คำขอปกติที่ Sale ส่ง) — **สถานะใหม่** |
| `pending` | SM ผ่านแล้ว รอ Senior Leader จัด CTS + อนุมัติ (ความหมายเดิม) |
| `mgr` | Senior Leader ผ่านแล้ว รอ BELLE อนุมัติขั้นสุดท้าย — **สถานะใหม่** |
| `approved` | ลงคิวจริงในปฏิทิน CTS |

- **role `sm`** — login "Sale Manager" 5 ทีม (Champion / Winner / Victory / KA / UPC)
  ต้องใส่รหัสผ่าน · email = `sm-<ทีมตัวเล็ก>@ctsgroup.merz.com` · KA ใช้ KAE1-4 เป็นรหัส Sale
- **4 แท็บของ SM** — ปฏิทิน (แยกตามรหัส Sale, เขียว=Confirmed แดง=TBC เหลือง=รอ CTS,
  งานกลาง MA + วันหยุดชุดเดียวกับ CTS) · คำขออนุมัติ (เน้น Support Product + Approve/Reject + คอมเมนต์)
  · Dashboard · Record
- **Record** (เดิม "แจ้งเตือน" — เปลี่ยนชื่อทุก role) — ค้นด้วยรหัสคำขอหรือชื่อคลินิก
  + เส้นทางอนุมัติครบทุกขั้น (ใคร/ขั้นไหน/เมื่อไหร่/คอมเมนต์)
  ขอบเขต: Sale=ของตัวเอง · SM=ทั้งทีม · Senior Leader=ที่ผ่านมือตัวเอง · Manager/Admin=ทั้งหมด
- **Dashboard ฝั่งขาย** — SM เห็นรวมทีม + ราย Sale by product + Support Product รวม
  + Clinics with Repeat Training Requests (ทีม KA เปลี่ยนเป็นสรุปราย Account)
  · Sale เห็นของตัวเอง (แท็บ "อนุมัติ" ของ Sale เปลี่ยนเป็น Dashboard)
- **ซิงก์อัตโนมัติทุก 30 วิ** — Admin แก้วันหยุด/งานกลาง แล้วทุกจอเห็นตรงกัน
  (ข้ามรอบเมื่อกำลังบันทึก หรือมีหน้าต่างซ้อนเปิดอยู่)
- **ไอคอน** — เปลี่ยน emoji สีทั้งหมดเป็น glyph ชุดเดียวกับแอป (◷ ◈ ⊘ ⊖ ⧉ ✦ ▲ ✓)

**ที่เก็บข้อมูล:** `trail` (หลักฐานทุกขั้น) เก็บใน `requests.client` jsonb ที่มีอยู่แล้ว —
ไม่ต้องสร้างตารางใหม่ และ `save()` ส่งขึ้นให้อัตโนมัติ
**SQL ที่ต้องรัน:** `supabase/sm_loop.sql` (ขยาย check constraint ให้รับ `'sm'`, `'mgr'`) — รันแล้ว

### ✅ เพิ่มเมื่อ 2026-09-08 (รอบ 2) — UI/UX เก็บรายละเอียด (`3459373`)

**ไม่แตะ schema เลย — ไม่มีตาราง / คอลัมน์ / constraint / RLS ใหม่ · SQL ที่ต้องรัน: ไม่มี**

- ป้ายสถานะ: `sm` = "รอ SM Approve" · `mgr` = "รอ CTM Approve"
- **Record** เปลี่ยนเป็นแถบย่อ 1 คำขอ 1 แถบ (สถานะ + Product ที่หัว · คลินิก / หัวข้อ /
  Module / ผู้ขอ / CTS ด้านล่าง) กดเข้าไปเห็นข้อมูลทุกช่อง + Support Product + รูปเคส
  + Loop การอนุมัติ (`trail`) + ข้อความสำหรับอีเมล
- ข้อความ "รออยู่ที่ ..." / คืนคิว / ยกเลิก เป็นแดงโทนอ่อน (`.alertx`)
- **ปฏิทิน Sale** ตอนยังไม่เลือก Product → แสดงคิวเทรนของ Sale คนนั้น (เดือน/สัปดาห์)
  พอเลือก Product กลับไปแสดงคิวว่างตามเงื่อนไขเดิมทุกอย่าง
- ปฏิทิน CTS: หัวกล่องคิว `booked` = "Approved" เขียว · `pend`/`tbc` = แดง
  + เครื่องหมายถูกเขียวหน้าคิวที่อนุมัติแล้ว · ป้าย TBC แดงขึ้นในมุมมองรายเดือนด้วย
- หน้า "คำขอ" เพิ่มช่องค้นชื่อคลินิก / รหัส TR (ใช้ `recHit()` ตัวเดียวกับ Record)
- **ฟอร์มคำขอ**: เลือกกี่ Product ก็มีช่อง "หัวข้อ" เท่านั้นช่อง เป็น dropdown ตาม Product
  (Ultherapy 6 / Xeomin 6 / Belotero 8 / Radiesse 5 หัวข้อ) + ช่อง "รายละเอียดเพิ่มเติม"
  ช่องเดียวท้ายสุด (ไม่บังคับ)
- ข้อมูลคลินิก เพิ่ม **ประเภทคลินิก** Chain / Branch / Single / Hospital (บังคับ)
- "ลิงก์ Google Map" → "สาขา/ลิงก์ Google Map" ทุกฟอร์ม

**ที่เก็บข้อมูล:** `ptopic` (หัวข้อรายProduct) · `topicNote` · `clinicType`
เก็บใน `requests.client` jsonb เหมือน `trail` — `save()` ส่งขึ้นอัตโนมัติ
`topic` ยังเป็นข้อความรวมเหมือนเดิม → การ์ด / ปฏิทิน / อีเมล / ค้นหา อ่านได้เหมือนเดิมทั้งหมด
คำขอเก่าที่หัวข้อเป็นข้อความอิสระ: กด "แก้ไข" แล้วระบบย้ายลงช่อง "รายละเอียดเพิ่มเติม" ให้เอง

### ยังต้องทำ (ให้ผู้ใช้ / เฟสถัดไป):
0. **เปลี่ยนรหัสผ่าน SM 5 ตัว** — ตั้งไว้ตอนทดสอบ ควรเปลี่ยนก่อนใช้ระยะยาว
0. ~~**งานกลาง MA ไม่แสดง (data gap)**~~ ✅ **แก้แล้ว** — seed 11 รายการจากแท็บ `_state` ของ sheet (version 376) เข้า `supabase/seed_ma_events.sql` + รันใน SQL Editor แล้ว (commit 649879c). ตาราง `events` มี 11 แถว (รวม MA Symposium 25/8). ตรวจแล้วว่า **สูตร/เงื่อนไขธุรกิจทั้งหมด (autoWindow/slotTime/freeIds/needsSenior/product gate/approval)** ยังอยู่ครบ (diff เก่า-ใหม่ = IDENTICAL); ที่ต่างคือ storage-layer เท่านั้น. render รองรับ multi-CTS สีรวมแล้ว (commit 75c40ca)
1. **เปลี่ยน email จริงของ 10 users** (placeholder `@ctsgroup.merz.com` → email จริง) — ต้องแก้ `EMAIL_OF` ใน index.html + Supabase Auth (Authentication → Users)
2. **ตั้ง/แจก password** ให้ทีม 10 คน (ตอนนี้ตั้งเอง/แจกเองได้)
3. **จำกัดพื้นที่ Sales** (RLS รอบสอง — จาก `using(true)` → เฉพาะพื้นที่ตัวเอง)
4. **เก็บ ANON key เป็น build-time / ไม่ hardcode** (ตอนนี้ฝังใน index.html — แจกทีมไม่ต้อง เพราะฝังแล้ว) — ปลอดภัยเป็น anon/publishable แต่ถ้าอยากเข้มงวดขึ้น
5. **เพิ่มข้อมูลจริง** — skills/events (Admin เพิ่มในแอป), คำขอจริง (จากทีม)
6. **ทดสอบเต็มวงจรบน GitHub Pages** (login + สร้างคำขอ + ดูคิว ออกจาก browser จริงบน URL สาธารณะ)
7. **ลบไฟล์ dev/test** ก่อนปล่อย (check*.js, bug/, TODO.txt — อยู่ใน .gitignore บางอัน แต่ยังใน repo)

---

## 🔁 จุดกลับ (rollback)

- `git checkout 52040af -- index.html` — ก่อน UI/UX รอบ 2
- `git tag before-sm-loop` — ก่อนเริ่มงาน SM Loop
- `backup-before-SM-20260908.html` — index.html ก่อนแก้
- `supabase/sm_loop.sql` รันซ้ำได้ ไม่เสียหาย

---

*ย้าย GAS → Supabase เสร็จ + SM Loop (อนุมัติ 4 ขั้น) + Record + Dashboard ฝั่งขาย — ใช้งานจริงบน GitHub Pages แล้ว (เหลืองาน user-facing ข้างบน)*

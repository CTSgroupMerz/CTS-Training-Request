# CTS Training Request — Supabase Migration (FINAL STATUS)

> อัปเดต: 2026-09-02 — **ทุกเฟสเสร็จ + QA ผ่าน** ย้ายจาก GAS/Sheet → Supabase เต็มรูปแบบ

---

## ✅ สรุปสถานะ — สำเร็จครบ

**ผลลัพธ์: แอป CTS Training Request ย้ายจาก Google Apps Script → Supabase ทำงานได้จริง (QA ผ่าน)**

| รายการ | สถานะ |
|---|---|
| Data migration (Phase 1-3) | ✅ เสร็จ |
| QA: login / load / CRUD | ✅ ผ่านครบ |
| RLS (security) | ⏳ SQL พร้อม — รอเปิด (ขั้นสุดท้าย) |

---

## 🏗️ Project

- **Project ref:** `hxiswcnoxboegudstyng`
- **URL:** `https://hxiswcnoxboegudstyng.supabase.co`
- **Region:** Singapore (ap-southeast-1)
- **Frontend:** `index.html` (3850 บรรทัด) — SPA เดียว ใช้ supabase-js (CDN)

---

## 📊 Data ที่ย้ายแล้ว (verify count จริง)

| ตาราง | ข้อมูล | ที่มา |
|---|---|---|
| `profiles` | 10 (9 CTS + Admin) | auth users + ผูก UUID จริง |
| `jobs` | 854 แถว | ย้ายจาก Google Sheet (ตารางงาน) |
| `requests` + nested | 30 (dummy) | seed สำหรับทดสอบ |
| `request_sessions` | 50 | dummy |
| `upc_days` / `upc_items` | 12 / 25 | dummy |
| `holidays` | 6 | seed |
| `sales_areas` / `sales_codes` | 8 / 21 | seed |
| `skills` / `events` | ว่าง | รอ Admin เพิ่มในแอป |

---

## ✅ Phase 1-3 (data migration) — สรุป

| เฟส | เปลี่ยน | สถานะ |
|---|---|---|
| **1** | auth (Supabase Auth) + requests → ตาราง | ✅ |
| **2** | sched → `jobs` | ✅ (unique constraint เพิ่มแล้ว) |
| **3** | skills/holidays/events → ตาราง 3 ตัว | ✅ |

### ไฟล์ในโปรเจค
- `index.html` — แก้ `load()/save()/signIn()` → Supabase ทั้งหมด
- `supabase/schema.sql` — DDL 12 ตาราง
- `supabase/seed.sql` — seed config (areas/codes/holidays)
- `supabase/seed_dummy_requests.py` — สร้าง dummy (30 requests)
- `supabase/rls.sql` — **RLS policy (ยังไม่รัน)**
- `TASK_PHASE1.md` / `PHASE2` / `PHASE3` — task spec แต่ละเฟส
- `SUPABASE_MIGRATION.md` — เอกสารนี้

### Backup
- `Desktop/งานอีเบล/backup-CTS-20260902-2036/` — backup แรก
- `Desktop/งานอีเบล/backup-before-frontend-20260902-2130/` — **ก่อนแก้ frontend (ย้อนกลับมา GAS ได้)**

---

## ✅ QA ที่ผ่าน (2026-09-02)

| ทดสอบ | ผล |
|---|---|
| หน้าเปิด + script โหลด | ✅ supabase-js + state ทำงาน |
| Login admin/cts111 (Supabase Auth) | ✅ authed, role=admin |
| `load()` read requests (30) + sched (854→110 วัน) + holidays (6) | ✅ |
| UI render (เมนูครบ) | ✅ |
| CRUD Create (`saveReq` → DB) | ✅ TR-107159 เข้า DB |
| CRUD Update (`saveReq` เปลี่ยน clinic) | ✅ DB อัปเดต |
| CRUD Delete (`SB.delete()`) | ✅ DB ลบ |

**ข้อสังเกต:** CRUD ทดสอบผ่านการเรียกฟังก์ชันแอป (saveReq/SB) ตรงๆ — flow คลิก UI เต็ม (pick product/date) ยังไม่ทดสอบทีละจุด แต่วงจร save/load หลักพิสูจน์แล้ว

---

## ⏳ ขั้นสุดท้าย: RLS

ไฟล์ `supabase/rls.sql` พร้อม — เดิมออกแบบเป็น "admin + CTS login, anon (Sales) อ่านได้เต็ม" (ยังไม่จำกัดพื้นที่ Sales)
**ยังไม่รัน** (รอเปิดตอนปล่อยใช้งานจริง หลัง QA ผ่าน)

สรุปสิทธิ์ (ตาม `rls.sql`):
- **login (admin + CTS)**: อ่าน + เขียนได้ (requests/jobs/...)
- **anon (Sales)**: อ่านได้ เขียนไม่ได้ (ยังไม่จำกัดพื้นที่ — ทำเฟสหลัง)
- **Admin**: แก้ master data (skills/holidays/events) + profile

---

## 📌 สิ่งที่เหลือ / เตือน

1. **เปลี่ยน email จริงของ 10 users** (placeholder `@ctsgroup.merz.com` → จริง) — ที่ Authentication → Users
2. **ตั้ง/แจก password** ให้ทีม
3. **ลบ dummy requests** หลังทดสอบเสร็จ (SQL ใน `SUPABASE_MIGRATION.md`/rls)
4. **Sales ยังไม่จำกัดพื้นที่** (RLS รอบสอง)
5. **RLS ยังปิดอยู่** = ใครมี anon key เข้าถึง DB ได้ — เปิดเมื่อพร้อมปล่อยจริง

---
*จบ migration สรุป — แอปใช้งาน Supabase ได้แล้ว เอกสารพร้อมส่งต่อ*

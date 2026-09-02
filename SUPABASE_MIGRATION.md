# CTS Training Request — Supabase Migration (FINAL STATUS)

> อัปเดต: 2026-09-03 — **ทุกเฟสเสร็จ + QA ผ่าน + RLS เปิด + บั๊กคิวแก้ + Deploy GitHub Pages**

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
| `skills` / `events` | ว่าง | รอ Admin เพิ่มในแอป |

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

### ยังต้องทำ (ให้ผู้ใช้ / เฟสถัดไป):
1. **เปลี่ยน email จริงของ 10 users** (placeholder `@ctsgroup.merz.com` → email จริง) — ต้องแก้ `EMAIL_OF` ใน index.html + Supabase Auth (Authentication → Users)
2. **ตั้ง/แจก password** ให้ทีม 10 คน (ตอนนี้ตั้งเอง/แจกเองได้)
3. **จำกัดพื้นที่ Sales** (RLS รอบสอง — จาก `using(true)` → เฉพาะพื้นที่ตัวเอง)
4. **เก็บ ANON key เป็น build-time / ไม่ hardcode** (ตอนนี้ฝังใน index.html — แจกทีมไม่ต้อง เพราะฝังแล้ว) — ปลอดภัยเป็น anon/publishable แต่ถ้าอยากเข้มงวดขึ้น
5. **เพิ่มข้อมูลจริง** — skills/events (Admin เพิ่มในแอป), คำขอจริง (จากทีม)
6. **ทดสอบเต็มวงจรบน GitHub Pages** (login + สร้างคำขอ + ดูคิว ออกจาก browser จริงบน URL สาธารณะ)
7. **ลบไฟล์ dev/test** ก่อนปล่อย (check*.js, bug/, TODO.txt — อยู่ใน .gitignore บางอัน แต่ยังใน repo)

---

*ย้าย GAS → Supabase เสร็จ + deploy + Push บน GitHub Pages — พร้อมใช้งานจริง (เหลืองาน user-facing ข้างบน)*

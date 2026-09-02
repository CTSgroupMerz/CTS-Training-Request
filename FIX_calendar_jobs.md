# FIX BUG:  ตารางงาน (jobs) ไม่แสดงในปฏิทิน — dayEntries ไม่อ่าน state.sched

## Problem
หลัง migration (Phase 2) ข้อมูลคิวงานย้ายไปตาราง `jobs` และ load() โหลดเข้า `state.sched`
ผ่าน `setJob()` (บรรทัด ~3753) แล้ว **แต่ `dayEntries()` (บรรทัด ~2139) ไม่เคยอ่านจาก `state.sched`** —
อ่านจาก `selfEvents` / `requests[].sessions` / `events` เท่านั้น → คิวงานใน state.sched ถูกเมิน → ปฏิทินว่าง

## Goal
ให้ `dayEntries(k, pool)` **เพิ่มการอ่านคิวจาก `state.sched[k][cid]`** (จาก jobs) ด้วย —
เพื่อให้คิวงาน 854 แถว (จาก Sheet) แสดงในปฏิทิน และอนาคตคำขอ (requests) สร้างคิวตามกฎเดิมยังทำงาน

## Context (โครงสร้างจริง)
- `state.sched[date][ctsId] = { am: job|null, pm: job|null }` (จาก setJob บรรทัด ~1104)
- `jobFrom(x)` (บรรทัด 3611): job มี `{kind, title, product, reqId, attendees[], start, end}`
- `jobOf(k,cid,slot)` (บรรทัด 1094) อ่านได้
- `dayEntries(k,pool)` (บรรทัด 2139-2173): ปัจจุบันสร้างคิวจาก selfEvents/requests/events
  → ใช้ `put(key, job, who)` ลง vector แล้ว sort

## What to do
ใน `dayEntries()` ก่อน return เพิ่มการอ่านจาก `state.sched`:
```js
// คิวจาก jobs (ตารางงาน) — ผ่าน state.sched
(canSeeNames()?visibleCTS():pool).forEach(cid=>{
  const s=(state.sched[k]&&state.sched[k][cid])||{};
  ['am','pm'].forEach(sl=>{
    const j=s[sl];
    if(!j)return;
    // ถ้าคิวนี้มาจากคำขอ (มี reqId) แล้ว dayEntries ส่วนล่างสร้างให้แล้ว → ข้าม (กันซ้ำ)
    if(j.reqId)return;
    put((j.selfId?'se-':'jb-')+cid+'-'+sl, {...j, allDay:false}, [cid]);
  });
});
```
- หมายเหตุ: คิวที่มี `reqId` (จากคำขอ) จะถูก dayEntries ส่วน requests ข้างล่างสร้างให้อยู่แล้ว → ข้ามกันซ้ำ
- คิวที่ `allDay` / คร่อมเที่ยง: ถ้า job จาก jobs มี start/end คลุมทั้งวัน → อาจ mark allDay
- `selfId` (งานที่ CTS ลงเอง) มาจาก selfEvents → ส่วน selfEvents ข้างล่างสร้างให้แล้ว → ข้าม

## Do NOT
- อย่าแก้ `setJob`/`jobOf`/`jobFrom`/`load()` ของเฟส 2 (ถูกแล้ว)
- อย่าแตะ `saveReq`/`toRow`/auth (เฟส 1)
- อย่าแก้ `weekHTML`/`monthHTML`/`renderCal` (เรียก dayEntries อยู่แล้ว)
- อย่าแตะ skills/holidays/events (เฟส 3)
- อย่าให้คิวซ้ำ (จาก jobs + จากคำขอ ที่ reqId ซ้ำ)

## Definition of Done
- [ ] เปิดปฏิทินแล้วคิวงาน (จาก jobs) แสดงในการ์ด `.job` (OTOS/Belotero/One on One ฯลฯ)
- [ ] ไม่ซ้ำกัน (คิวจาก jobs กับคิวจากคำขอ ที่ reqId ตรง → แสดงครั้งเดียว)
- [ ] อนาคตคำขอใหม่ → ยังสร้างคิวตามกฎเดิม (pend/approved → booked/tbc)
- [ ] มุมมอง week + month แสดง
- [ ] verify: `.job` count > 0 บนหน้าปฏิทิน

## ข้อมูล
- Supabase: `https://hxiswcnoxboegudstyng.supabase.co` (jobs 854 แถว) — ไม่ต้องแตะ DB
- แก้ที่ไฟล์ `C:/Users/TUF GAMING/Desktop/งานอีเบล/งานที่3/index.html`

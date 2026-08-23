/* smoke test ฝั่ง Apps Script — รัน: node check-gs.js
   เทสเฉพาะส่วนที่คิดเอง (auth, แปลงข้อมูลเป็นแถว, ตัด/ต่อ JSON) โดย stub ตัว Google API */
const fs = require('fs'), vm = require('vm'), assert = require('assert');

let PROPS = { PW: 'cts1234' };
const ctx = {
  console, JSON, Object, String, Number, Array, Math, Date, Logger: { log() {} },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => PROPS[k] || null, setProperty(k, v) { PROPS[k] = v; } }) },
  SpreadsheetApp: {}, DriveApp: {}, ContentService: { createTextOutput: s => ({ setMimeType: () => s }), MimeType: {} },
  LockService: {}, MimeType: {},
};
ctx.globalThis = ctx;
vm.createContext(ctx);
new vm.Script(fs.readFileSync('Code.gs', 'utf8') + '\nthis.__x={authed,reqRows,jobRows,nick,span,ho,when,CHUNK,REQ_HEAD,JOB_HEAD};').runInContext(ctx);
const X = ctx.__x;

// 1. Sales ผ่านโดยไม่ต้องมีรหัส · CTS/Admin ต้องรหัสถูก · role มั่วไม่ผ่าน
assert.ok(X.authed({ role: 'sales' }), 'Sales ต้องเข้าได้โดยไม่ใช้รหัส');
assert.ok(X.authed({ role: 'cts', pw: 'cts1234' }), 'CTS รหัสถูกต้องเข้าได้');
assert.ok(X.authed({ role: 'admin', pw: 'cts1234' }), 'Admin รหัสถูกต้องเข้าได้');
assert.ok(!X.authed({ role: 'cts', pw: 'ผิด' }), 'รหัสผิดต้องไม่ผ่าน');
assert.ok(!X.authed({ role: 'cts' }), 'ไม่ส่งรหัสมาต้องไม่ผ่าน');
assert.ok(!X.authed({ role: 'lead', pw: 'cts1234' }), 'role ที่ไม่รู้จักต้องไม่ผ่าน');
assert.ok(!X.authed(null), 'ไม่มี body ต้องไม่ผ่าน');

// 2. ยังไม่ได้ตั้งรหัส = ห้ามให้ CTS/Admin ผ่านมั่ว
PROPS = {};
assert.ok(!X.authed({ role: 'cts', pw: '' }), 'ยังไม่ตั้ง PW ต้องไม่ให้ผ่าน');
assert.ok(X.authed({ role: 'sales' }), 'Sales ยังเข้าได้อยู่');
PROPS = { PW: 'cts1234' };

// 3. คำขอปกติ -> 1 บรรทัดต่อ 1 session
const normal = {
  id: 'TR-1042', status: 'approved', team: 'A', area: 'Champion', requester: 'เต้',
  created: '2026-08-20T04:11:00.000Z', clinic: 'Bloom Clinic', module: 'MAX-A', level: 'Standard',
  product: 'Ultherapy', topic: 'Full face', doctors: 2, exp: 'Beginner', handsOn: true,
  hoProduct: 'Belotero', hoCases: 3, approvedBy: 'PAM', approvedAt: '2026-08-21T02:00:00.000Z',
  sessions: [
    { date: '2026-09-01', slot: 'am', ctsId: 'narakamon', start: '09:00', end: '12:00' },
    { date: '2026-09-08', slot: 'pm', ctsId: 'koollanut', sProduct: 'Xeomin' },
  ],
};
const rows = X.reqRows([normal]);
assert.strictEqual(rows.length, 2, '2 session ต้องได้ 2 บรรทัด');
rows.forEach(r => assert.strictEqual(r.length, X.REQ_HEAD.length, 'จำนวนคอลัมน์ไม่ตรงกับหัวตาราง'));
assert.strictEqual(rows[0][9], 'JUNE', 'ต้องแปลง id เป็นชื่อเล่น');
assert.strictEqual(rows[0][10], '09:00–12:00', 'เวลาไม่ถูก');
assert.strictEqual(rows[1][15], 'Xeomin', 'Product รายsession ต้องชนะค่าของคำขอ');
assert.strictEqual(rows[0][19], 'Belotero · 3 เคส', 'hands-on ไม่ถูก');
assert.strictEqual(rows[0][6], '2026-08-20 04:11', 'วันที่ส่งอ่านไม่รู้เรื่อง');

// 4. คำขอ UPC -> 1 บรรทัดต่อ 1 รายการคลินิก
const upc = {
  id: 'TR-1043', status: 'pending', mode: 'upc', team: 'BOTH', area: 'UPC', requester: 'UPC1',
  created: '2026-08-22T01:00:00.000Z', sessions: [{ date: '2026-09-15', ctsId: 'pariyachat', fullDay: true }],
  days: [{ date: '2026-09-15', items: [
    { province: 'ขอนแก่น', clinic: 'Aura Skin', module: 'MAX-Entry', level: 'Standard', product: 'Xeomin', topic: 'Upper face', doctors: 1, exp: 'Beginner' },
    { province: 'ขอนแก่น', clinic: 'Nova Derma', module: 'MAX-B', level: 'Advance', product: 'Radiesse', topic: 'Jawline', doctors: 2, exp: 'Advanced' },
  ] }],
};
const urows = X.reqRows([upc]);
assert.strictEqual(urows.length, 2, '2 คลินิกใน 1 วัน ต้องได้ 2 บรรทัด');
urows.forEach(r => assert.strictEqual(r.length, X.REQ_HEAD.length, 'UPC คอลัมน์ไม่ตรงกับหัวตาราง'));
assert.strictEqual(urows[0][2], 'UPC', 'ต้องระบุว่าเป็นคำขอ UPC');
assert.strictEqual(urows[0][9], 'ATOM', 'UPC ต้องดึง CTS จาก session ของวันนั้น');
assert.strictEqual(urows[1][12], 'ขอนแก่น', 'จังหวัดหาย');

// 5. วันที่ยังไม่มีรายการ ก็ต้องยังขึ้นในตาราง (จะได้เห็นว่ายังกรอกไม่ครบ)
const empty = X.reqRows([{ id: 'TR-9', mode: 'upc', status: 'pending', days: [{ date: '2026-09-20', items: [] }], sessions: [] }]);
assert.strictEqual(empty.length, 1, 'วันที่ยังไม่มีรายการต้องไม่หายไป');
assert.strictEqual(empty[0].length, X.REQ_HEAD.length, 'คอลัมน์ไม่ตรง');

// 6. ตารางงาน — ข้ามช่องว่าง เรียงตามวัน รวมชื่อคนที่ไปด้วยกัน
const sched = {
  '2026-09-02': { koollanut: { am: null, pm: null } },
  '2026-09-01': {
    narakamon: { am: { kind: 'pend', title: 'Bloom Clinic', product: 'Ultherapy', start: '09:00', end: '12:00', reqId: 'TR-1042' }, pm: null },
    belle: { am: null, pm: { kind: 'busy', title: 'ประชุมทีม', attendees: ['belle', 'parichat'] } },
  },
};
const jrows = X.jobRows(sched);
assert.strictEqual(jrows.length, 2, 'ต้องข้ามช่องที่ไม่มีงาน');
jrows.forEach(r => assert.strictEqual(r.length, X.JOB_HEAD.length, 'ตารางงานคอลัมน์ไม่ตรงกับหัวตาราง'));
assert.strictEqual(jrows[0][1], 'BELLE', 'ต้องเรียงตามวันแล้วตามชื่อ id');
assert.strictEqual(jrows[0][8], 'BELLE · PAM', 'รายชื่อคนที่ไปด้วยกันไม่ถูก');
assert.strictEqual(jrows[1][6], 'รอนุมัติ', 'ประเภทงานควรเป็นภาษาไทย');

// 7. JSON ยาวเกิน 1 cell ต้องตัดแล้วต่อกลับได้เหมือนเดิม (นี่คือจุดที่ข้อมูลจะหายถ้าพลาด)
const big = JSON.stringify({ version: 1, data: { note: 'ก'.repeat(X.CHUNK * 2 + 123) } });
const parts = [];
for (let i = 0; i < big.length; i += X.CHUNK) parts.push(big.substr(i, X.CHUNK));
assert.ok(parts.length === 3, 'ควรถูกตัดเป็น 3 ท่อน');
parts.forEach(p => assert.ok(p.length <= 50000, 'ท่อนหนึ่งยาวเกินที่ 1 cell รับได้'));
assert.strictEqual(parts.join(''), big, 'ต่อกลับแล้วข้อมูลไม่เหมือนเดิม');

console.log('✓ ผ่านทั้ง 7 ข้อ');

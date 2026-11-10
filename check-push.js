// เทสว่าใครได้แจ้งเตือนเมื่อคำขอเปลี่ยนสถานะ — ดึงส่วน build ของ supabase/functions/push/index.ts มารันตรงๆ (node 22.6+ ตัด type เอง)
// รัน: node check-push.js
const fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, 'supabase/functions/push/index.ts'), 'utf8');
const part = src.split('// ==== build:start')[1].split('// ==== build:end')[0].replace(/^.*\n/, '');
const tmp = path.join(os.tmpdir(), 'cts-push-build.ts');
fs.writeFileSync(tmp, 'type Row = Record<string, any>;\n' + part + '\nexport { build };\n');

import('file://' + tmp.replace(/\\/g, '/')).then(({ build }) => {
  const R = (status, extra = {}) => ({ id: 'TR-1100AB', mode: 'normal', clinic: 'Demo Clinic', status,
    client: { status, area: 'Champion', requesterId: 'C01', sessions: [{ date: '2026-12-03', ctsId: 'narakamon', co: ['onkamol'] }], ...extra } });
  const to = (...a) => (build(...a) || { to: [] }).to.sort().join(',');

  assert.equal(to('INSERT', R('sm'), null, ''), 'sm:Champion', 'Sale ส่งคำขอ -> SM ของพื้นที่');
  assert.equal(to('UPDATE', R('pending'), R('sm'), ''), 'lead', 'SM อนุมัติ -> Leader');
  assert.equal(to('UPDATE', R('mgr'), R('pending'), 'parichat'), 'mgr', 'Leader -> CTM');
  assert.equal(to('UPDATE', R('approved'), R('mgr'), 'belle'), 'cts:narakamon,cts:onkamol,sale:C01', 'อนุมัติ -> Sale + ผู้เทรนทุกคน');
  assert.equal(to('UPDATE', R('approved'), R('pending'), 'narakamon'), 'cts:onkamol,sale:C01', 'ไม่แจ้งคนที่กดเอง');
  assert.equal(to('UPDATE', R('cancelled'), R('approved'), ''), 'cts:narakamon,cts:onkamol', 'Sale ยกเลิกเอง -> ไม่แจ้งตัวเอง');
  assert.equal(to('UPDATE', R('expired'), R('tbc'), ''), 'sale:C01', 'TBC หมดอายุ -> Sale แม้ไม่มีคนล็อกอิน');
  assert.equal(to('UPDATE', R('approved'), R('approved'), 'parichat'), '', 'สถานะเดิม ผู้เทรนเดิม -> ไม่แจ้ง');
  const swapped = R('approved', { sessions: [{ date: '2026-12-03', ctsId: 'pitchaporn' }] });
  assert.equal(to('UPDATE', swapped, R('approved'), 'parichat'), 'cts:pitchaporn', 'เปลี่ยนผู้เทรน -> แจ้งคนใหม่เท่านั้น');
  const upc = { id: 'TR-1101UP', mode: 'upc', status: 'approved', client: { status: 'approved', area: 'UPC', requesterId: 'UPC3',
    days: [{ date: '2026-12-08', items: [{ ctsId: 'koollanut' }] }] } };
  assert.equal(to('UPDATE', upc, { ...upc, status: 'mgr', client: { ...upc.client, status: 'mgr' } }, 'belle'), 'cts:koollanut,sale:UPC3', 'UPC ผู้เทรนรายคลินิก');
  assert.equal(build('UPDATE', R('approved'), R('mgr'), 'belle').body, 'TR-1100AB · Demo Clinic · 3/12/2569');
  console.log('check-push: 11 ข้อผ่าน');
});

/**
 * CTS Training Request — backend
 *
 * เก็บข้อมูลทั้งหมดใน Google Sheet ไฟล์เดียว 3 แท็บ
 *   _state      JSON ของระบบ (แท็บนี้ซ่อนไว้ ห้ามแก้ด้วยมือ) — ตัวจริงที่แอปอ่าน/เขียน
 *   คำขอ        ตารางคำขอเทรน อ่านง่าย 1 บรรทัด = 1 วันเทรน   } สร้างใหม่ทุกครั้งที่บันทึก
 *   ตารางงาน     คิวงานรายวันของ CTS ทุกคน                      } แก้ในชีตไม่มีผลกับแอป
 *
 * แชร์ไฟล์ Sheet นี้ให้ทีมดูได้เลย ทุกครั้งที่มีคนอัปเดตในแอป ชีตจะอัปเดตตาม
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ตั้งค่า  ->  GAS editor -> Project Settings -> Script Properties
 *     PW       = cts1234        รหัสสำหรับ CTS และ Admin (Sales ไม่ต้องใช้รหัส)
 *     SHEET_ID = ...            ไม่ใส่ก็ได้ — ไม่ใส่ = สร้างไฟล์ใหม่ให้อัตโนมัติ
 *                               ถ้าอยากเก็บใน workbook เดิม เอา id จาก URL มาใส่
 *
 * หา URL ของชีต: กด Run ที่ฟังก์ชัน sheetUrl แล้วดูใน Execution log
 *
 * deploy
 *   1. script.google.com -> New project -> วางไฟล์นี้
 *   2. ตั้ง Script Properties ตามด้านบน
 *   3. Deploy -> New deployment -> Web app
 *        Execute as     : Me
 *        Who has access : Anyone       <- ต้องเป็น "Anyone" ไม่ใช่ "Anyone with Google account"
 *   4. กด Authorize (ต้องอนุญาต Sheets + Drive)
 *   5. คัดลอก Web app URL ไปใส่ที่ตัวแปร API ใน index.html
 *
 * แก้โค้ดทีหลัง — โค้ดที่ deploy ไว้ไม่อัปเดตเอง ต้องสั่ง deploy ใหม่เสมอ เลือกได้ 2 แบบ
 *   ใช้ URL เดิม  : Deploy -> Manage deployments -> ปุ่มดินสอ -> Version: New version -> Deploy
 *   ได้ URL ใหม่  : Deploy -> New deployment   (URL เดิมยังทำงานอยู่ ใช้ตอนอยากเลิกใช้ URL เก่า)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ขอบเขตของ auth: รหัสผ่านกันไม่ให้คนทั่วไป "กดเข้าโหมด CTS/Admin" ผ่านหน้าเว็บเท่านั้น
 * เพราะฝั่ง Sales ไม่ต้องใช้รหัส endpoint นี้จึงเปิดให้เขียนได้โดยไม่ต้องยืนยันตัวตน —
 * ใครรู้ URL แล้วเขียนสคริปต์ยิงเอง ก็แก้ข้อมูลได้ทุกส่วน
 * ระดับนี้พอสำหรับเครื่องมือใช้ภายในทีม ถ้าต้องการปิดจริงต้องให้ Sales ใช้รหัสด้วย
 */

var NEED_PW  = ['cts', 'admin'];      // Sales เข้าได้เลย ไม่ต้องใช้รหัส
var RAW      = '_state';
var CHUNK    = 45000;                 // 1 cell เก็บได้ 50,000 ตัวอักษร เผื่อไว้หน่อย
var FILE_NAME = 'CTS Training Request — Data';

/* ชื่อเล่นของ CTS — ต้องตรงกับ const CTS ใน index.html (มีไว้ให้ชีตอ่านรู้เรื่องเท่านั้น) */
var NICK = {
  parichat:'PAM', narakamon:'JUNE', koollanut:'POP', onkamol:'SUI', kanwara:'MILK',
  witchukorn:'POR', pariyachat:'ATOM', pitchaporn:'EYE', belle:'BELLE'
};
var KIND = { pend:'รอนุมัติ', busy:'งาน', ok:'อนุมัติแล้ว' };

/* ========================= ที่เก็บข้อมูล ========================= */

function book() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (err) { /* id ใช้ไม่ได้ -> สร้างใหม่ */ }
  }
  var ss = SpreadsheetApp.create(FILE_NAME);
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

function tab(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function sheetUrl() {
  Logger.log(book().getUrl());
}

function readState(ss) {
  var sh = tab(ss, RAW);
  var n = sh.getLastRow();
  if (!n) return { version: 0, data: {} };
  var parts = sh.getRange(1, 1, n, 1).getValues();
  var s = '';
  for (var i = 0; i < parts.length; i++) s += parts[i][0];
  try { return JSON.parse(s); } catch (err) { return { version: 0, data: {} }; }
}

function writeState(ss, obj) {
  var s = JSON.stringify(obj);
  var rows = [];
  for (var i = 0; i < s.length; i += CHUNK) rows.push([s.substr(i, CHUNK)]);
  var sh = tab(ss, RAW);
  sh.clear();
  sh.getRange(1, 1, rows.length, 1).setValues(rows);
  sh.hideSheet();
}

/* ========================= API ========================= */

function authed(req) {
  if (!req) return false;
  if (req.role === 'sales') return true;
  if (NEED_PW.indexOf(req.role) < 0) return false;
  var want = PropertiesService.getScriptProperties().getProperty('PW');
  return !!want && want === req.pw;
}

function doGet() {
  return json({ ok: false, hint: 'POST only' });
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false }); }
  if (!authed(req)) return json({ ok: false });

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = book();
    var cur = readState(ss);

    if (!req.data) return json({ ok: true, version: cur.version, data: cur.data });

    // มีคนบันทึกทับไปแล้วระหว่างที่ฝั่ง client ถือข้อมูลเก่าอยู่ -> ส่งของล่าสุดกลับไปให้ใช้แทน
    if (req.version !== cur.version) {
      return json({ ok: true, stale: true, version: cur.version, data: cur.data });
    }
    var next = { version: cur.version + 1, data: req.data };
    writeState(ss, next);
    mirror(ss, req.data);
    return json({ ok: true, version: next.version, data: next.data });
  } finally {
    lock.releaseLock();
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ========================= แท็บที่คนอ่าน ========================= */
/* ทางเดียว: แอป -> ชีต   แก้ในชีตแล้วแอปไม่รับรู้ (ถูกเขียนทับรอบบันทึกถัดไป) */

function mirror(ss, d) {
  paint(tab(ss, 'คำขอ'), REQ_HEAD, reqRows(d.requests || []));
  paint(tab(ss, 'ตารางงาน'), JOB_HEAD, jobRows(d.sched || {}));
}

function paint(sh, head, rows) {
  sh.clear();
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#EFEAFB');
  if (rows.length) sh.getRange(2, 1, rows.length, head.length).setValues(rows);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, head.length);
}

var REQ_HEAD = ['รหัสคำขอ', 'สถานะ', 'ประเภท', 'ทีม', 'พื้นที่', 'ผู้ขอ', 'วันที่ส่ง',
  'วันเทรน', 'ช่วง', 'CTS', 'เวลา', 'คลินิก', 'จังหวัด', 'Module', 'ระดับ', 'Product',
  'หัวข้อ', 'จำนวนแพทย์', 'ประสบการณ์', 'Hands-on', 'อนุมัติโดย', 'เวลาอนุมัติ'];

function reqRows(reqs) {
  var out = [];
  for (var i = 0; i < reqs.length; i++) {
    var r = reqs[i];
    var head = [r.id, r.status, r.mode === 'upc' ? 'UPC' : 'ปกติ', r.team, r.area,
      r.requester || r.requesterId || '', when(r.created)];
    var tail = [r.approvedBy || '', when(r.approvedAt)];

    if (r.mode === 'upc') {
      var days = r.days || [];
      for (var j = 0; j < days.length; j++) {
        var day = days[j], items = day.items || [];
        var cts = nick(sessCts(r, day.date));
        if (!items.length) { out.push(head.concat([day.date, 'ทั้งวัน', cts, '', '', '', '', '', '', '', '', '', ''], tail)); continue; }
        for (var k = 0; k < items.length; k++) {
          var it = items[k];
          out.push(head.concat([day.date, 'ทั้งวัน', cts, '', it.clinic || '', it.province || '',
            it.module || '', it.level || '', it.product || '', it.topic || '', it.doctors || '',
            it.exp || '', ho(it)], tail));
        }
      }
    } else {
      var ss2 = r.sessions || [];
      if (!ss2.length) { out.push(head.concat(['', '', '', '', r.clinic || '', '', r.module || '', r.level || '', r.product || '', r.topic || '', r.doctors || '', r.exp || '', ho(r)], tail)); continue; }
      for (var m = 0; m < ss2.length; m++) {
        var s = ss2[m];
        out.push(head.concat([s.date, s.slot === 'am' ? 'เช้า' : s.slot === 'pm' ? 'บ่าย' : 'ทั้งวัน',
          nick(s.ctsId), span(s.start, s.end), r.clinic || '', '', r.module || '', r.level || '',
          s.sProduct || r.product || '', s.sTopic || r.topic || '', r.doctors || '', r.exp || '', ho(r)], tail));
      }
    }
  }
  return out;
}

var JOB_HEAD = ['วันที่', 'CTS', 'ช่วง', 'เวลา', 'หัวข้อ', 'Product', 'ประเภท', 'อ้างอิงคำขอ', 'ไปด้วยกัน'];

function jobRows(sched) {
  var out = [], dates = Object.keys(sched).sort();
  for (var i = 0; i < dates.length; i++) {
    var k = dates[i], byCts = sched[k] || {};
    var ids = Object.keys(byCts).sort();
    for (var j = 0; j < ids.length; j++) {
      var slots = byCts[ids[j]] || {};
      var names = ['am', 'pm'];
      for (var n = 0; n < 2; n++) {
        var job = slots[names[n]];
        if (!job) continue;
        out.push([k, nick(ids[j]), names[n] === 'am' ? 'เช้า' : 'บ่าย', span(job.start, job.end),
          job.title || '', job.product || '', KIND[job.kind] || job.kind || '', job.reqId || '',
          (job.attendees || []).map(nick).join(' · ')]);
      }
    }
  }
  return out;
}

/* ========================= ตัวช่วยเล็กๆ ========================= */

function nick(id) { return id ? (NICK[id] || id) : ''; }
function span(a, b) { return a && b ? a + '–' + b : ''; }
function ho(x) { return x.handsOn ? (x.hoProduct || 'มี') + (x.hoCases ? ' · ' + x.hoCases + ' เคส' : '') : ''; }
function when(v) { return v ? String(v).replace('T', ' ').slice(0, 16) : ''; }

/* UPC: session ของวันนั้นถูกจัดให้ CTS คนไหน */
function sessCts(r, date) {
  var ss = r.sessions || [];
  for (var i = 0; i < ss.length; i++) if (ss[i].date === date) return ss[i].ctsId;
  return null;
}

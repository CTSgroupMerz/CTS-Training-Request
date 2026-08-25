/* เทสปฏิทินตามเวลาจริง — รัน: node check-cal.js
   ครอบบั๊กที่แก้: คิวขึ้นซ้ำ 2 อัน · คิวที่ 3 ของวันหาย · คิวว่างฝั่ง Sales ไม่บวกเวลาเดินทาง 2 ชม. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const L=html.split('\n');
const a=L.findIndex(l=>l.trim()==='<script>'), b=L.findIndex(l=>l.trim()==='</script>');
let src=L.slice(a+1,b).join('\n').replace(/^restoreLogin\(\);.*$/m,'');

const el=()=>({innerHTML:'',classList:{add(){},remove(){}},style:{},querySelectorAll:()=>[],
  addEventListener(){},appendChild(){},focus(){},scrollIntoView(){},scrollTop:0,dataset:{},textContent:'',value:''});
const store={};
const banners=[], badge={n:0};   // จับ showNotification / setAppBadge ที่แอปยิงออกมา
const cache={};const G=id=>cache[id]||(cache[id]=el());   // คืน element เดิมทุกครั้ง จะได้อ่าน innerHTML กลับมาตรวจได้
const sheet=()=>G('sheetBody').innerHTML;
const ctx={console,setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},Date,Math,JSON,Object,Array,String,Number,Set,Map,Promise,
  URL:{createObjectURL:()=>''},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  window:{innerWidth:1200,addEventListener(){}},
  document:{getElementById:G,querySelectorAll:()=>[],createElement:el,body:el(),addEventListener(){},execCommand(){}},
  navigator:{clipboard:{writeText:()=>Promise.resolve()},
    serviceWorker:{register:()=>Promise.resolve(),ready:Promise.resolve({showNotification:(t,o)=>{banners.push({t,o});}})},
    setAppBadge:n=>{badge.n=n;},clearAppBadge:()=>{badge.n=0;}},
  Notification:{permission:'granted',requestPermission:()=>Promise.resolve('granted')},
  fetch:()=>Promise.resolve({json:()=>Promise.resolve({ok:true,version:1,data:{}})})};
ctx.globalThis=ctx;
vm.createContext(ctx);
src += '\n__x={state,dayEntries,entriesOf,autoWindow,slotTime,slotStatus,slotWindow,syncSelf,CTS,SLOT_DEF,AUTO_RULE,'
     + 'renderCal,monthHTML,weekHTML,openDay,openSelfEntry,openEventForm,openJob,reqCard,dayAnon,dayNamed,maCard,'+
     'PRODUCTS,PRODHEX,LEAD_IDS,BOOKABLE_CTS,skillOf,setSkill,canTrain,needsSenior,freeIds,renderSkills,'+
     'canApprove,missingRequired,sweepTBC,tbcLeft,openForm,prodGate,SLOT_HOURS,t24,upLabel,whoAmI,setAvail,isClosed,openAvail,submit,submitTBC,'+
     'assign,confirmTBC,holidayOf,prodText,togglePick,maDay,badgeCount,syncBadge,renderFeed,notify,pendingCount,popBanner};';
new vm.Script(src).runInContext(ctx);
const X=ctx.__x;

const K='2026-08-24';
const ME=X.CTS[0].id, OTHER=X.CTS[1].id;
/* ดูเป็น CTS คนแรก — visibleCTS() จะได้ไม่ตัดใครทิ้ง */
X.state.role='cts'; X.state.me=ME; X.state.authed=true; X.state.tab='cal';

let seq=0;
const addSelf=o=>{const ev={id:'SE-T'+(++seq),date:K,dateEnd:'',allDay:false,title:'งาน'+seq,detail:'',
  product:'',topics:[],attendees:[ME],owner:ME,start:'09:00',end:'10:00',...o};
  X.state.selfEvents.push(ev); X.syncSelf(ev); return ev;};
const reset=()=>{X.state.selfEvents=[];X.state.sched={};X.state.avail={};X.state.requests=[];X.state.events=[];};

/* 1. คิวคร่อมเที่ยง (09:00–14:00) เคยถูกเขียนลงทั้งช่อง am และ pm แล้วโผล่ซ้ำ 2 อัน */
reset(); addSelf({start:'09:00',end:'14:00'});
assert.strictEqual(X.entriesOf(K,ME).length,1,'คิวคร่อมเที่ยงต้องขึ้นอันเดียว ไม่ซ้ำ');

/* 2. คิวมากกว่า 2 ช่วงในวันเดียว ต้องเห็นครบ (เดิม sched มีแค่ 2 ช่อง คิวที่ 3 หาย) */
reset();
addSelf({start:'09:00',end:'10:00'}); addSelf({start:'10:30',end:'11:30'}); addSelf({start:'14:00',end:'15:00'});
const es=X.entriesOf(K,ME);
assert.strictEqual(es.length,3,'3 คิวในวันเดียวต้องเห็นครบ 3 — เห็น '+es.length);
assert.strictEqual(es.map(e=>e.start).join(','),'09:00,10:30,14:00','ต้องเรียงตามเวลาจริง');

/* 3. เคสจริงที่เต้เจอ: คิว 11:30–12:30 → บ่ายต้องว่าง 14:30 ไม่ใช่ 13:00
      (12:30 + 2 ชม.เดินทาง/พัก = 14:30 · เพดาน session 3 ชม. → 17:30) */
reset(); addSelf({start:'11:30',end:'12:30'});
const w=X.autoWindow(K,ME,'pm');
assert.ok(w,'คิวเช้าเลิก 12:30 ต้องคำนวณหน้าต่างบ่ายใหม่');
assert.strictEqual(w.start,'14:30','ต้องบวก 2 ชม.จากคิวที่เลิก 12:30');
assert.strictEqual(w.end,'17:30','จบตามเพดาน session 3 ชม.');
assert.strictEqual(X.slotTime(K,ME,'pm').start,'14:30','เวลาที่เอาไปโชว์ต้องเป็น 14:30');

/* 4. เวลาที่ปฏิทิน Sale โชว์ = เวลาว่างจริง ไม่ใช่ SLOT_DEF ตายตัว
      (ให้คนอื่นติดงานบ่ายหมด เหลือคนเดียวที่ว่าง → ต้องโชว์หน้าต่างของคนนั้น) */
X.CTS.slice(1).forEach(c=>{const ev={id:'SE-B'+c.id,date:K,dateEnd:'',allDay:true,title:'ติดงาน',detail:'',
  product:'',topics:[],attendees:[c.id],owner:c.id,start:'09:00',end:'16:30'};
  X.state.selfEvents.push(ev);X.syncSelf(ev);});
const sw=X.slotWindow(K,'pm');
assert.strictEqual(sw.start+'–'+sw.end,'14:30–17:30',
  'ปฏิทิน Sale ต้องโชว์ 14:30–17:30 ไม่ใช่ '+X.SLOT_DEF.pm.start+'–'+X.SLOT_DEF.pm.end+' ตายตัว');

/* 5. คิวทั้งวัน = 1 คิวเต็มช่อง ไม่แยกเช้า/บ่าย */
reset(); addSelf({allDay:true});
const ad=X.entriesOf(K,ME);
assert.strictEqual(ad.length,1,'คิวทั้งวันต้องขึ้นอันเดียว');
assert.ok(ad[0].job.allDay,'ต้องติดธง allDay ไว้ให้ปฏิทินวาดเต็มช่อง');

/* 6. คิวว่างต้องไม่ขึ้นกับตัวกรองหน้าจอ (กรองคนอื่นออกแล้วห้ามกลายเป็นว่าง) */
reset(); addSelf({start:'09:00',end:'12:00'});
X.state.filter=new Set([OTHER]);
assert.notStrictEqual(X.slotStatus(K,ME,'am'),'free','กรองหน้าจอแล้วคิวที่มีอยู่ต้องไม่หายไป');
X.state.filter=new Set();

/* 7. ทุกหน้าจอที่แก้ต้องเรนเดอร์ได้โดยไม่ throw (จับ typo ใน template) */
reset();
addSelf({start:'11:30',end:'12:30',topics:['KUD','MSC'],detail:'ลงเครื่องใหม่ 2 ห้อง'});
addSelf({start:'14:00',end:'15:00'});
addSelf({allDay:true,attendees:[ME,OTHER]});
X.state.events.push({id:'EV-T1',date:K,slot:'am',type:'Workshop',title:'MA งานกลาง',cts:[OTHER]});
X.state.requests.push({id:'TR-T1',team:X.CTS[0].team,area:'BKK',mode:'std',status:'pending',
  module:'Module 1',level:'Standard',product:['Ultherapy','Belotero'],topic:'หัวข้อ',clinic:'คลินิกทดสอบ',
  map:'',doctors:2,exp:'',handsOn:false,hoProduct:'',hoCases:'',photos:[],requester:'เทส',requesterId:'x',
  sessions:[{date:K,slot:'pm',ctsId:ME,start:'15:30',end:'16:30',emailOk:true}]});

const screens={};
for(const [name,fn] of [['month',()=>X.monthHTML()],['week',()=>X.weekHTML()],['maCard',()=>X.maCard()],
   ['renderCal',()=>X.renderCal()],['openDay',()=>{X.openDay(K);return sheet();}],['openSelfEntry',()=>{X.openSelfEntry(K);return sheet();}],
   ['openEventForm',()=>{X.openEventForm();return sheet();}],['openEventFormEdit',()=>{X.openEventForm('EV-T1');return sheet();}],
   ['reqCard',()=>X.reqCard(X.state.requests[0],true)],
   ['openJob',()=>{X.openJob(K,X.entriesOf(K,ME)[0].key);return sheet();}]]){
  try{ screens[name]=fn(); }catch(e){ throw new Error('เรนเดอร์ '+name+' ไม่ผ่าน: '+e.message); }
}
assert.ok(/KUD/.test(screens.openSelfEntry),'ฟอร์มเพิ่มคิวงานต้องมีหัวข้อ KUD/Med School/MSC');
assert.ok(/รายละเอียดคิวงาน/.test(screens.openSelfEntry),'ฟอร์มเพิ่มคิวงานต้องมีช่องรายละเอียด');
assert.ok(/data-evc=/.test(screens.openEventForm),'ฟอร์มงานกลาง MA ต้องเลือก CTS รายคนได้');
assert.ok(/Ultherapy/.test(screens.reqCard)&&/Belotero/.test(screens.reqCard),'การ์ดคำขอต้องโชว์ product ครบทุกตัว');

/* 8. คำเดิมที่สั่งให้ตัดออก ต้องไม่เหลือในไฟล์ */
assert.ok(!/จองได้ตามตกลง/.test(html),'ต้องไม่เหลือคำว่า \"จองได้ตามตกลง\"');

/* 9. ปุ่มลบคำขอ ขึ้นเฉพาะ CTS */
X.state.role='admin';
assert.ok(!/data-del=/.test(X.reqCard(X.state.requests[0],true)),'Admin ต้องไม่เห็นปุ่มลบคำขอ');
X.state.role='sales';
assert.ok(!/data-del=/.test(X.reqCard(X.state.requests[0],false)),'Sales ต้องไม่เห็นปุ่มลบคำขอ');
X.state.role='cts';
assert.ok(/data-del=/.test(X.reqCard(X.state.requests[0],false)),'CTS ต้องเห็นปุ่มลบคำขอ');

/* 10. เครื่องหมาย ✓ Email Approved โผล่ในปฏิทิน */
assert.ok(/okmk/.test(X.weekHTML()),'คิวที่ Email Approved แล้วต้องมีเครื่องหมาย ✓ ในปฏิทิน');


/* ===== ของใหม่รอบนี้ ===== */
const clean=()=>{reset();X.state.skills={};X.state.draft=null;X.state.picks=[];X.state.tbcMode=false;};
/* ME (CTS[0]) เป็น Senior Leader ไม่อยู่ในกลุ่มที่ Sales จองได้ — เทสคิวว่างต้องใช้ 6 คนนี้ */
const B1=X.BOOKABLE_CTS()[0].id;

/* 11. Product 9 ตัว + ชื่อเก่ายังอ่านสีได้ */
assert.strictEqual(X.PRODUCTS.length,9,'ต้องมี 9 product');
assert.ok(X.PRODUCTS.includes('Belotero Revive')&&X.PRODUCTS.includes('Radiesse Plus'),'ชื่อ product ไม่ครบ');
assert.ok(X.PRODHEX['Belotero'],'ชื่อเก่า Belotero ต้องยังมีสี ไม่งั้นคำขอเก่าพัง');
assert.strictEqual(X.PRODHEX['Belotero Soft'],X.PRODHEX['Belotero Volume'],'Belotero ต้องสีเดียวกันทั้งตระกูล');

/* 12. Skills ปิดหมดตอนเริ่ม -> Sales ไม่เห็นคิวว่างเลย */
clean();
X.state.role='sales';X.state.area='Champion';X.state.tab='cal';
X.state.draft={product:['Ultherapy'],slots:1};
assert.strictEqual(X.freeIds(K,'am').length,0,'ยังไม่เปิด Skills ต้องไม่มีคิวว่าง');

/* 13. เปิด Skills แล้วเห็นเฉพาะคนที่เปิด */
X.setSkill(B1,'Ultherapy','self');
assert.strictEqual(X.freeIds(K,'am').join(','),B1,'ต้องเห็นเฉพาะคนที่เปิด Skills');
assert.strictEqual(X.freeIds(K,'am').length,1,'คนที่ไม่ได้เปิดต้องไม่โผล่');

/* 14. เลือก product ที่คนนั้นไม่ได้เปิด -> หายไป */
X.state.draft.product=['Ultherapy','Xeomin'];
assert.strictEqual(X.freeIds(K,'am').length,0,'ต้องเปิด Skills ครบทุก product ที่ขอ');
X.setSkill(B1,'Xeomin','self');
assert.strictEqual(X.freeIds(K,'am').length,1,'เปิดครบแล้วต้องกลับมา');

/* 15. ยังไม่เลือก Product -> ปฏิทิน Sale ไม่โชว์คิวว่าง */
X.state.draft.product=[];
assert.strictEqual(X.freeIds(K,'am').length,0,'ยังไม่เลือก Product ต้องยังไม่โชว์คิวว่าง');

/* 16. Train with Senior — ตัวอย่างที่เต้ยกมา: TwS ว่าง 4 คน หัวหน้าว่าง 2 -> นับได้ 2 */
clean();
X.state.role='sales';X.state.area='Champion';
X.state.draft={product:['Ultherapy'],slots:1};
const four=X.BOOKABLE_CTS().slice(0,4).map(c=>c.id);
four.forEach(id=>X.setSkill(id,'Ultherapy','senior'));
assert.strictEqual(X.freeIds(K,'am').length,2,
  'TwS 4 คน + หัวหน้าว่าง 2 -> ต้องนับ 2 (ได้ '+X.freeIds(K,'am').length+')');
/* หัวหน้าติดงานไป 1 คน -> เหลือ 1 */
const busySr={id:'SE-SR',date:K,dateEnd:'',allDay:true,title:'ประชุม',detail:'',product:'',topics:[],
  attendees:[X.LEAD_IDS[0]],owner:X.LEAD_IDS[0],start:'09:00',end:'16:30'};
X.state.selfEvents.push(busySr);X.syncSelf(busySr);
assert.strictEqual(X.freeIds(K,'am').length,1,'หัวหน้าว่าง 1 -> TwS รับได้ 1');
/* คนที่เปิดแบบ self ไม่ถูกจำกัดด้วยหัวหน้า */
X.setSkill(four[0],'Ultherapy','self');
assert.strictEqual(X.freeIds(K,'am').length,2,'self 1 + TwS 1 = 2');

/* 17. หัวข้อบังคับ 5 ข้อ */
const blank={product:[],topic:'',clinic:'',doctors:'',requester:''};
assert.strictEqual(X.missingRequired(blank).length,5,'ต้องบังคับ 5 หัวข้อ');
assert.strictEqual(X.missingRequired({product:['Ultherapy'],topic:'ก',clinic:'ข',doctors:2,requester:'ค'}).length,0,
  'กรอกครบแล้วต้องผ่าน');

/* 18. เวลาในฟอร์ม จองเช้าเลือกบ่ายไม่ได้ */
const amSel=X.t24('x','09:00','am'), pmSel=X.t24('y','13:00','pm');
assert.ok(!/>14</.test(amSel),'ช่วงเช้าต้องเลือก 14:00 ไม่ได้');
assert.ok(/>14</.test(pmSel),'ช่วงบ่ายต้องเลือก 14:00 ได้');
assert.ok(!/>09</.test(pmSel),'ช่วงบ่ายต้องเลือก 09:00 ไม่ได้');

/* 19. หัวหน้าทั้ง 2 คนอนุมัติได้ทุกคำขอ ไม่แบ่งทีม */
const req={id:'TR-Z',team:'A',status:'pending',sessions:[]};
X.state.role='cts';
X.LEAD_IDS.forEach(id=>{X.state.me=id;assert.ok(X.canApprove(req),id+' ต้องอนุมัติได้');});
X.state.me=B1;assert.ok(!X.canApprove(req),'CTS ธรรมดาต้องอนุมัติไม่ได้');

/* 20. คิว TBC หมดอายุ 3 วันแล้วถูกปล่อยคืน */
clean();
const old3=new Date(Date.now()-4*864e5).toISOString();
const fresh=new Date().toISOString();
X.state.requests=[
  {id:'TB-1',status:'tbc',tbcAt:old3,team:'A',sessions:[{date:K,slot:'am',ctsId:B1}]},
  {id:'TB-2',status:'tbc',tbcAt:fresh,team:'A',sessions:[{date:K,slot:'pm',ctsId:B1}]}];
X.state.requests.forEach(r=>r.sessions.forEach(sn=>X.state.sched[sn.date]=X.state.sched[sn.date]||{}));
assert.strictEqual(X.sweepTBC(),1,'ต้องปล่อยเฉพาะใบที่เกิน 3 วัน');
assert.strictEqual(X.state.requests[0].status,'expired','ใบเก่าต้องหมดอายุ');
assert.strictEqual(X.state.requests[1].status,'tbc','ใบใหม่ต้องยังอยู่');
assert.ok(X.tbcLeft(X.state.requests[1])>0,'ใบใหม่ต้องยังเหลือเวลา');

/* 21. หน้า Admin Skills เรนเดอร์ได้ และคนอื่นเข้าไม่ได้ */
X.state.role='admin';X.state.tab='skill';
try{X.renderSkills();}catch(e){throw new Error('renderSkills พัง: '+e.message);}
X.state.role='cts';X.state.me=B1;
try{X.renderSkills();}catch(e){throw new Error('renderSkills (non-admin) พัง: '+e.message);}

/* 22. ป้าย "แก้ล่าสุดโดย" */
assert.strictEqual(X.upLabel({}),'','ไม่มีข้อมูลต้องไม่ขึ้นป้าย');
assert.ok(/แก้ล่าสุดโดย POP/.test(X.upLabel({upBy:'POP',upAt:new Date().toISOString()})),'ป้ายต้องมีชื่อคนแก้');


/* 23. Admin ต้องเห็นปุ่ม Email Approved ในคิวที่มาจากคำขอ */
clean();
X.state.role='admin';X.state.tab='cal';X.state.me=null;
X.state.requests=[{id:'TR-M',team:'A',status:'approved',mode:'std',module:'MAX-Entry',
  product:['Ultherapy'],topic:'x',clinic:'คลินิก',map:'',doctors:1,exp:'',handsOn:false,photos:[],
  requester:'a',requesterId:'a',sessions:[{date:K,slot:'am',ctsId:B1,start:'09:00',end:'12:00'}]}];
const eK=X.entriesOf(K,B1)[0];
assert.ok(eK,'ต้องมีคิวจากคำขอ');
X.openJob(K,eK.key);
const sheetHtml=sheet();
assert.ok(/data-mail=/.test(sheetHtml),'Admin ต้องเห็นปุ่มยืนยัน Email Approved');
assert.ok(/Email Approved/.test(sheetHtml),'ต้องมีข้อความ Email Approved');
/* กดแล้วต้องติดธง และ ✓ ต้องขึ้นในปฏิทิน */
X.state.requests[0].sessions[0].emailOk=true;
assert.ok(/okmk/.test(X.weekHTML()),'ติดธงแล้ว ✓ ต้องขึ้นในปฏิทินรายสัปดาห์');
assert.ok(/okmk/.test(X.monthHTML()),'ติดธงแล้ว ✓ ต้องขึ้นในปฏิทินรายเดือนด้วย');
/* CTS ธรรมดาไม่ควรกดได้ */
X.state.role='cts';X.state.me=B1;
X.openJob(K,X.entriesOf(K,B1)[0].key);
assert.ok(!/data-mail=/.test(sheet()),'CTS ไม่ควรกดยืนยัน Email Approved ได้');

/* 24. ปิดรับคิวว่าง — CTS/Admin ปิดช่องได้ Sales จะไม่เห็นเป็นคิวว่าง */
clean();
X.state.role='sales';X.state.area='Champion';
X.state.draft={product:['Ultherapy'],slots:1};
X.setSkill(B1,'Ultherapy','self');
assert.ok(X.freeIds(K,'am').includes(B1),'ก่อนปิดต้องว่าง');
X.setAvail(K,B1,'am',{closed:true,start:'09:00',end:'12:00'});
assert.strictEqual(X.slotStatus(K,B1,'am'),'closed','สถานะต้องเป็น closed');
assert.ok(!X.freeIds(K,'am').includes(B1),'ปิดแล้วต้องไม่ถูกนับเป็นคิวว่าง');
X.setAvail(K,B1,'am',null);
assert.ok(X.freeIds(K,'am').includes(B1),'เปิดคืนแล้วต้องกลับมาว่าง');


/* 25. คนที่ถูกจัดให้อัตโนมัติตอนส่งคำขอ ต้องเป็น 1 ใน 6 คนที่รับคิวได้เท่านั้น
      (เคยพลาดไปโดน PAM ซึ่งเป็น Senior Leader เพราะเลือกจาก teamCTS ตรงๆ) */
clean();
X.state.role='sales';X.state.area='Champion';X.state.salesId='C01';X.state.authed=true;
X.BOOKABLE_CTS().forEach(c=>X.setSkill(c.id,'Ultherapy','self'));
X.state.draft={module:'MAX-Entry',slots:1,sessions:1,level:'',product:['Ultherapy'],
  topic:'หัวข้อ',clinic:'คลินิก',map:'',doctors:2,exp:'',handsOn:false,hoProduct:'',hoCases:'',
  photos:[],requester:'ผู้ขอ'};
X.state.picks=[{date:K,slot:'am',ctsId:null,start:'09:00',end:'12:00'}];
X.submit();
const got=X.state.requests[0].sessions[0].ctsId;
assert.ok(got,'ต้องจัดคนให้อัตโนมัติ');
assert.ok(X.BOOKABLE_CTS().some(c=>c.id===got),
  'ต้องเป็น 1 ใน 6 คนที่รับคิวได้ ไม่ใช่ Senior Leader — ได้ '+got);
assert.ok(!X.LEAD_IDS.includes(got),'ห้ามจัดให้ PAM/MILK');
/* คนที่ยังไม่เปิด Skills ก็ต้องไม่ถูกจัดให้ */
clean();
X.state.role='sales';X.state.area='Champion';X.state.salesId='C01';
const only=X.BOOKABLE_CTS()[3].id;
X.setSkill(only,'Xeomin','self');
X.state.draft={module:'MAX-Entry',slots:1,sessions:1,level:'',product:['Xeomin'],
  topic:'ก',clinic:'ข',map:'',doctors:1,exp:'',handsOn:false,hoProduct:'',hoCases:'',photos:[],requester:'ค'};
X.state.picks=[{date:K,slot:'am',ctsId:null,start:'09:00',end:'12:00'}];
X.submit();
assert.strictEqual(X.state.requests[0].sessions[0].ctsId,only,
  'ต้องจัดให้เฉพาะคนที่เปิด Skills ของ product นั้น');

/* 26. คิวงานของ CTS เลือกได้หลาย product และปฏิทินต้องโชว์ครบ */
clean();
X.state.role='cts';X.state.me=B1;X.state.tab='cal';
const multi={id:'SE-MP',date:K,dateEnd:'',allDay:false,title:'งานหลาย product',detail:'',
  product:['Ultherapy','Xeomin'],topics:[],attendees:[B1],owner:B1,start:'09:00',end:'11:00'};
X.state.selfEvents.push(multi);X.syncSelf(multi);
assert.strictEqual(X.prodText(['Ultherapy','Xeomin']),'Ultherapy · Xeomin','ต้องรวมชื่อ product หลายตัว');
assert.ok(/Ultherapy · Xeomin/.test(X.weekHTML()),'ปฏิทินรายสัปดาห์ต้องโชว์ product ครบทุกตัว');
X.openSelfEntry(K,'SE-MP');
assert.ok(/aria-pressed="true">Ultherapy/.test(sheet())&&/aria-pressed="true">Xeomin/.test(sheet()),
  'ฟอร์มคิวงานต้องติ๊ก product ไว้ได้พร้อมกันมากกว่า 1 ตัว');

/* 27. วันหยุด — CTS ยังลงคิวงานได้ และ Sales ยังกดขอ Request ได้ แต่ไม่โชว์จำนวนคิวว่าง */
clean();
X.state.holidays=[{date:K,name:'วันหยุดทดสอบ'}];
X.state.role='cts';X.state.me=B1;
const holJob={id:'SE-H',date:K,dateEnd:'',allDay:false,title:'งานวันหยุด',detail:'',
  product:[],topics:[],attendees:[B1],owner:B1,start:'09:00',end:'11:00'};
X.state.selfEvents.push(holJob);X.syncSelf(holJob);
assert.ok(/งานวันหยุด/.test(X.weekHTML()),'ปฏิทิน CTS ต้องโชว์คิวงานในวันหยุด');
assert.ok(/งานวันหยุด/.test(X.monthHTML()),'ปฏิทินเดือนของ CTS ต้องโชว์คิวงานในวันหยุด');
X.state.role='sales';X.state.area='Champion';X.state.draft={product:['Ultherapy'],slots:1};
X.BOOKABLE_CTS().forEach(c=>X.setSkill(c.id,'Ultherapy','self'));
const holDay=X.dayAnon(K);
assert.ok(/วันหยุดทดสอบ/.test(holDay),'ฝั่ง Sales ต้องบอกว่าเป็นวันหยุด');
assert.ok(/data-anon="am"/.test(holDay)&&!/data-anon="am"[^>]*disabled/.test(holDay),
  'วันหยุดยังกดขอคิวได้เหมือนเสาร์–อาทิตย์');
X.state.holidays=[];

/* 28. วัน MA — ฝั่ง Sales ตัดคิวทั้งวัน แม้งานกลางระบุแค่ครึ่งวัน */
clean();
X.state.events=[{id:'MA-T',date:K,title:'Workshop',type:'Workshop',slot:'am',cts:'all'}];
X.state.role='sales';X.state.area='Champion';X.state.draft={product:['Ultherapy'],slots:1};
X.BOOKABLE_CTS().forEach(c=>X.setSkill(c.id,'Ultherapy','self'));
assert.ok(X.maDay(K),'ต้องรู้ว่าวันนี้มีงานกลาง MA');
const maHtml=X.dayAnon(K);
assert.strictEqual((maHtml.match(/ติดงานกลาง MA/g)||[]).length,2,'MA ต้องตัดทั้งเช้าและบ่าย');
/* CTS ยังลงคิวงานในวัน MA ได้ */
X.state.role='cts';X.state.me=B1;
const maJob={id:'SE-MA',date:K,dateEnd:'',allDay:false,title:'งานวัน MA',detail:'',
  product:[],topics:[],attendees:[B1],owner:B1,start:'13:00',end:'15:00'};
X.state.selfEvents.push(maJob);X.syncSelf(maJob);
assert.ok(/งานวัน MA/.test(X.weekHTML()),'ปฏิทิน CTS ต้องลงคิวในวันที่มีงานกลาง MA ได้');

/* 29. คิว TBC — จำนวน session ไม่คุมจำนวนวันที่เลือก */
clean();
X.state.role='sales';X.state.area='Champion';X.state.salesId='C01';
X.state.tbcMode=true;
X.state.draft={module:'MAX-Entry',slots:1,sessions:1,level:'',product:['Ultherapy'],
  topic:'ก',clinic:'ข',map:'',doctors:1,exp:'',handsOn:false,hoProduct:'',hoCases:'',photos:[],requester:'ค'};
X.BOOKABLE_CTS().forEach(c=>X.setSkill(c.id,'Ultherapy','self'));
['2026-08-24','2026-08-25','2026-08-26'].forEach(d=>X.togglePick(d,'am',null));
assert.strictEqual(X.state.picks.length,3,'โหมด TBC ต้องเลือกได้เกินจำนวน session');
X.openForm();
assert.ok(!/เลือกเกินมา/.test(sheet()),'ฟอร์ม TBC ต้องไม่เตือนว่าเลือกเกิน');
assert.strictEqual(X.state.picks.length,3,'เปิดฟอร์มแล้ววันที่เลือกต้องไม่ถูกตัดทิ้ง');
ctx.window.__grab=null;   // DOM จำลองอ่านค่ากลับไม่ได้ — ข้ามการดูดค่าจากฟอร์ม
X.submitTBC();
const tbc=X.state.requests[0];
assert.strictEqual(tbc.status,'tbc','ต้องได้คำขอสถานะ tbc');
assert.strictEqual(tbc.sessions.length,3,'คิว TBC ต้องล็อกครบ 3 วัน');

/* 30. หัวหน้าเปลี่ยน CTS ของคิว TBC รายวันได้ แล้วส่งกลับว่าตรวจแล้ว */
X.state.role='admin';X.state.me=null;X.state.tbcMode=false;
X.confirmTBC(tbc.id);
assert.ok(/data-sess="0"/.test(sheet())&&/data-sess="2"/.test(sheet()),
  'ต้องเปลี่ยน CTS ได้ทุกวันที่ล็อกไว้');
assert.ok(/ตรวจคิว TBC/.test(sheet()),'ปุ่มต้องเป็นการส่งกลับว่าตรวจคิว TBC แล้ว');
/* จำลองการเลือกคนใหม่ในวันแรก แล้วกดบันทึก */
const day0=tbc.sessions[0], newCts=X.BOOKABLE_CTS().find(c=>c.id!==day0.ctsId).id;
const sels=[{dataset:{sess:'0'},value:newCts},{dataset:{sess:'1'},value:tbc.sessions[1].ctsId||''},
            {dataset:{sess:'2'},value:tbc.sessions[2].ctsId||''}];
cache.sheetBody.querySelectorAll=q=>q==='[data-sess]'?sels:[];
cache.saveRe.onclick();
assert.strictEqual(tbc.sessions[0].ctsId,newCts,'ต้องเปลี่ยน CTS ของวันแรกได้');
assert.strictEqual(X.state.sched[tbc.sessions[0].date][newCts].am.kind,'tbc',
  'คิวที่ย้ายมาต้องยังเป็น TBC ไม่กลายเป็นรออนุมัติ');
assert.ok(tbc.tbcOk,'กดบันทึกแล้วต้องถือว่าตรวจคิว TBC แล้ว');
assert.strictEqual(tbc.status,'tbc','ตรวจแล้วยังเป็นคิว TBC รอ Sales ยืนยัน');

/* 31. Sales ต้องไม่เห็นกล่องบอกจำนวนคนที่เทรนได้ แต่ CTS ที่เปิดปฏิทิน Sale เห็น */
clean();
X.state.role='sales';X.state.area='Champion';X.state.tab='cal';
X.state.draft={product:['Ultherapy'],slots:1};
X.BOOKABLE_CTS().forEach(c=>X.setSkill(c.id,'Ultherapy','self'));
assert.ok(!/เทรนได้ \d+ คน/.test(X.prodGate()),'Sales ต้องไม่เห็นจำนวนคนที่เทรนได้');
X.state.role='cts';X.state.me=B1;X.state.tab='sale';
assert.ok(/เทรนได้ \d+ คน/.test(X.prodGate()),'CTS ที่เปิดปฏิทิน Sale ต้องยังเห็น');

/* 32. ป้ายตัวเลขบนไอคอนแอป — หัวหน้า/Admin นับงานที่ต้องอนุมัติ · คนอื่นนับแจ้งเตือนที่ยังไม่ได้เปิดดู */
clean();
X.state.feed=[];X.state.authed=true;
X.state.role='admin';X.state.me=null;
const pend={id:'TR-BG',team:'A',status:'pending',mode:'std',module:'MAX-Entry',product:['Ultherapy'],
  topic:'ก',clinic:'ข',map:'',doctors:1,exp:'',handsOn:false,photos:[],requester:'ค',requesterId:'C01',
  sessions:[{date:K,slot:'am',ctsId:B1,start:'09:00',end:'12:00'}]};
X.state.requests=[pend];X.notify(pend,'pending');
assert.strictEqual(X.badgeCount(),X.pendingCount(),'Admin ต้องเห็นตัวเลขเท่าจำนวนที่ต้องอนุมัติ');
assert.ok(X.badgeCount()>0,'มีคำขอค้างต้องขึ้นตัวเลข');
/* Sales เห็นเฉพาะแจ้งเตือนของตัวเองที่ยังไม่ได้เปิดดู */
delete store['cts-feed-seen'];
X.state.role='sales';X.state.area='Champion';X.state.salesId='C01';X.state.tab='feed';
assert.strictEqual(X.badgeCount(),1,'Sales ต้องเห็น 1 แจ้งเตือนที่ยังไม่ได้อ่าน');
X.state.salesId='V01';
assert.strictEqual(X.badgeCount(),0,'แจ้งเตือนของคนอื่นต้องไม่ถูกนับ');
X.state.salesId='C01';
X.renderFeed();   // เปิดแท็บแจ้งเตือน = อ่านแล้ว
assert.strictEqual(X.badgeCount(),0,'เปิดแท็บแจ้งเตือนแล้วตัวเลขต้องหาย');
X.state.authed=false;
assert.strictEqual(X.badgeCount(),0,'ออกจากระบบแล้วต้องไม่มีตัวเลขค้าง');
X.syncBadge();
assert.strictEqual(badge.n,0,'ออกจากระบบแล้วต้องล้างป้ายบนไอคอน');

/* 33. แบนเนอร์แจ้งเตือน — เด้งเฉพาะของใหม่ ของตัวเอง และไม่เด้งซ้ำ */
const tick=()=>new Promise(r=>setTimeout(r,0));
(async()=>{
  clean();
  X.state.authed=true;X.state.role='sales';X.state.area='Champion';X.state.salesId='C01';X.state.feed=[];
  store['cts-noti-at']=Date.now()-1000;
  banners.length=0;
  X.popBanner();await tick();
  assert.strictEqual(banners.length,0,'ไม่มีของใหม่ต้องไม่เด้ง');

  const nb={id:'TR-NB',team:'A',status:'pending',mode:'std',module:'MAX-Entry',product:['Ultherapy'],
    topic:'ก',clinic:'คลินิกใหม่',map:'',doctors:1,exp:'',handsOn:false,photos:[],requester:'ค',requesterId:'C01',
    sessions:[{date:K,slot:'am',ctsId:B1,start:'09:00',end:'12:00'}]};
  X.state.requests=[nb];X.notify(nb,'pending');
  X.popBanner();await tick();
  assert.strictEqual(banners.length,1,'มีคำขอใหม่ต้องเด้งแบนเนอร์');
  assert.ok(/รออนุมัติ/.test(banners[0].t),'หัวข้อแบนเนอร์ต้องบอกสถานะ');
  assert.ok(/คลินิกใหม่/.test(banners[0].o.body),'แบนเนอร์ต้องบอกว่าเป็นคำขอไหน');

  X.popBanner();await tick();
  assert.strictEqual(banners.length,1,'รายการเดิมต้องไม่เด้งซ้ำ');

  /* คำขอของ Sales คนอื่นต้องไม่เด้งใส่เรา */
  await new Promise(r=>setTimeout(r,5));
  const other={...nb,id:'TR-NC',requesterId:'V01',clinic:'คลินิกคนอื่น'};
  X.state.requests.push(other);X.notify(other,'pending');
  X.popBanner();await tick();
  assert.strictEqual(banners.length,1,'คำขอของ Sales คนอื่นต้องไม่เด้งใส่เรา');

  console.log('✓ ผ่านทั้ง 33 ข้อ');
})().catch(e=>{console.error(e.message);process.exit(1);});

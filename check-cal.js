/* เทสปฏิทินตามเวลาจริง — รัน: node check-cal.js
   ครอบบั๊กที่แก้: คิวขึ้นซ้ำ 2 อัน · คิวที่ 3 ของวันหาย · คิวว่างฝั่ง Sales ไม่บวกเวลาเดินทาง 2 ชม. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const L=html.split('\n');
const a=L.findIndex(l=>l.trim()==='<script>'), b=L.findIndex(l=>l.trim()==='</script>');
let src=L.slice(a+1,b).join('\n').replace(/^restoreLogin\(\);.*$/m,'');

const el=()=>({innerHTML:'',classList:{add(){},remove(){},contains(){return false}},style:{},querySelectorAll:()=>[],
  addEventListener(){},appendChild(){},focus(){},scrollIntoView(){},scrollTop:0,dataset:{},textContent:'',value:''});
const store={};
const badge={n:0};   // จับ setAppBadge ที่แอปยิงออกมา
const cache={};const G=id=>cache[id]||(cache[id]=el());   // คืน element เดิมทุกครั้ง จะได้อ่าน innerHTML กลับมาตรวจได้
const sheet=()=>G('sheetBody').innerHTML;
const ctx={console,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},Date,Math,JSON,Object,Array,String,Number,Set,Map,Promise,
  URL:{createObjectURL:()=>''},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  window:{innerWidth:1200,addEventListener(){}},
  document:{getElementById:G,querySelectorAll:()=>[],createElement:el,body:el(),addEventListener(){},execCommand(){}},
  navigator:{clipboard:{writeText:()=>Promise.resolve()},
    setAppBadge:n=>{badge.n=n;},clearAppBadge:()=>{badge.n=0;}},
  fetch:()=>Promise.resolve({json:()=>Promise.resolve({ok:true,version:1,data:{}})})};
ctx.globalThis=ctx;
vm.createContext(ctx);
src += '\n__x={state,dayEntries,entriesOf,autoWindow,slotTime,slotStatus,slotWindow,syncSelf,CTS,SLOT_DEF,AUTO_RULE,'
     + 'renderCal,monthHTML,weekHTML,openDay,openSelfEntry,openEventForm,openJob,reqCard,dayAnon,dayNamed,maCard,'+
     'PRODUCTS,PRODHEX,LEAD_IDS,BOOKABLE_CTS,skillOf,setSkill,canTrain,needsSenior,freeIds,renderSkills,'+
     'canApprove,missingRequired,sweepTBC,tbcLeft,openForm,prodGate,SLOT_HOURS,t24,upLabel,whoAmI,setAvail,isClosed,openAvail,submit,submitTBC,'+
     'assign,confirmTBC,holidayOf,prodText,togglePick,maDay,badgeCount,syncBadge,renderFeed,notify,pendingCount,render,tabsFor,mailTag,okMark,openReqSession,reqWho,adoptJob,clearSelf,tpAllRows,psTeam,myRequests,ackReq,needAck,ackedJob,upcAble,upcFree,upcMissing,submitUPC,snap,SAVED,newId,TODAY,runsOf,spanLabel,maSpans,maSid,holSid,seniorsFree,approve,saleRows,toRow,fromRow,ackList,ST_LABEL,notify,jobOf,upcCard,smReqCard,upcDayBox,bookUPC,isBookable,prodList,'
     + 'renderDash,dashScope,tpTableRows,TP_TCOLS,recTableRows,REC_COLS,reqClinicOn,smChip,canSwapCts,smMonthHTML,csvText,tpSupHTML,openSupClinic};';
src += '\nObject.assign(__x,{lateSess,layoutEntries,selfEntries,upcDayWho,isUrgent,timelineHTML,'
     + 'upcFree,upcAble,topicsOf,TOPIC_TAGS,tpState,tpRows,cancelReq,bookUPC,clearUPC,jobStyle,tbcTag,smEntries});';
new vm.Script(src).runInContext(ctx);
const X=ctx.__x;

const K='2026-08-24';
/* วันในอนาคตพอผ่านกติกา 'ขอคิวล่วงหน้าอย่างน้อย 14 วัน' (LEAD_DAYS) — ใช้กับเทสที่กดเลือกวันจริง */
const FUT=n=>{const d=new Date();d.setDate(d.getDate()+30+(n||0));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
/* ตรึงปฏิทินไว้ที่สัปดาห์/เดือนของ K — ปกติแอปเปิดที่ "วันนี้" พอเวลาผ่าน 24 ส.ค. 69 ไป
   คิวทดสอบก็หลุดออกนอกจอที่ monthHTML/weekHTML วาด แล้วเทสพังเองทั้งที่โค้ดไม่ได้เสีย */
X.state.month=new Date(2026,7,1);
X.state.weekStart=new Date(2026,7,24);
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
assert.ok(/class="okmk/.test(X.weekHTML()),'คิวที่ Email Approved แล้วต้องมีเครื่องหมาย ✓ ในปฏิทิน');


/* ===== ของใหม่รอบนี้ ===== */
const clean=()=>{reset();X.state.skills={};X.state.draft=null;X.state.picks=[];X.state.tbcMode=false;};
/* ME (CTS[0]) เป็น Senior Leader ไม่อยู่ในกลุ่มที่ Sales จองได้ — เทสคิวว่างต้องใช้ 6 คนนี้ */
const B1=X.BOOKABLE_CTS()[0].id;

/* 11. Product 10 ตัว (เพิ่ม Radiesse Hybrid) + ชื่อเก่ายังอ่านสีได้ */
assert.strictEqual(X.PRODUCTS.length,10,'ต้องมี 10 product');
assert.ok(X.PRODUCTS.includes('Radiesse Hybrid'),'ต้องมี Radiesse Hybrid');
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

/* 17. หัวข้อบังคับ 6 ข้อ (เพิ่มประเภทคลินิก · หัวข้อเช็กรายProduct จาก ptopic) */
const blank={product:[],topic:'',clinic:'',doctors:'',requester:''};
assert.strictEqual(X.missingRequired(blank).length,6,'ต้องบังคับ 6 หัวข้อ');
assert.strictEqual(X.missingRequired({product:['Ultherapy'],ptopic:{Ultherapy:'ก'},clinic:'ข',clinicType:'Single',doctors:2,requester:'ค'}).length,0,
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
assert.ok(/data-mailtag=/.test(sheetHtml),'Admin ต้องเห็นปุ่มยืนยัน Email Approved');
assert.ok(/Email Approved/.test(sheetHtml),'ต้องมีข้อความ Email Approved');
/* กดแล้วต้องติดธง และ ✓ ต้องขึ้นในปฏิทิน */
X.state.requests[0].sessions[0].emailOk=true;
assert.ok(/class="okmk/.test(X.weekHTML()),'ติดธงแล้ว ✓ ต้องขึ้นในปฏิทินรายสัปดาห์');
assert.ok(/class="okmk/.test(X.monthHTML()),'ติดธงแล้ว ✓ ต้องขึ้นในปฏิทินรายเดือนด้วย');
/* CTS ธรรมดาไม่ควรกดได้ */
X.state.role='cts';X.state.me=B1;
X.openJob(K,X.entriesOf(K,B1)[0].key);
assert.ok(!/data-mailtag=/.test(sheet()),'CTS ไม่ควรกดยืนยัน Email Approved ได้');

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
  topic:'หัวข้อ',ptopic:{Ultherapy:'หัวข้อ',Xeomin:'หัวข้อ'},clinicType:'Single',clinic:'คลินิก',map:'',doctors:2,exp:'',handsOn:false,hoProduct:'',hoCases:'',
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
  topic:'ก',ptopic:{Ultherapy:'ก',Xeomin:'ก'},clinicType:'Single',clinic:'ข',map:'',doctors:1,exp:'',handsOn:false,hoProduct:'',hoCases:'',photos:[],requester:'ค'};
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
  topic:'ก',ptopic:{Ultherapy:'ก',Xeomin:'ก'},clinicType:'Single',clinic:'ข',map:'',doctors:1,exp:'',handsOn:false,hoProduct:'',hoCases:'',photos:[],requester:'ค'};
X.BOOKABLE_CTS().forEach(c=>X.setSkill(c.id,'Ultherapy','self'));
[FUT(0),FUT(1),FUT(2)].forEach(d=>X.togglePick(d,'am',null));
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
  topic:'ก',ptopic:{Ultherapy:'ก',Xeomin:'ก'},clinicType:'Single',clinic:'ข',map:'',doctors:1,exp:'',handsOn:false,photos:[],requester:'ค',requesterId:'C01',
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

/* 33. แถบเมนูล่างบนมือถือต้องมีช่องเท่าจำนวนแท็บของแต่ละ role
      (เดิมล็อกไว้ 4 ช่อง แท็บ "แจ้งเตือน" ของ CTS/Admin เลยตกขอบจอ) */
clean();
X.state.authed=true;X.state.teamView='A';
[['sales',{area:'Champion',salesId:'C01',me:null}],['cts',{me:B1}],['admin',{me:null}]].forEach(([role,extra])=>{
  Object.assign(X.state,{role,tab:'cal'},extra);
  X.render();
  const html=cache.root.innerHTML, n=X.tabsFor().length;
  assert.ok(new RegExp('class="botnav[^"]*" style="grid-template-columns:repeat\\('+n+',1fr\\)"').test(html),
    role+': แถบล่างต้องแบ่ง '+n+' ช่อง');
  assert.strictEqual((html.match(/data-tab=/g)||[]).length,n*2,
    role+': ต้องมีแท็บครบ '+n+' อัน ทั้งเมนูข้างและแถบล่าง');
});
X.state.role='cts';X.state.me=B1;X.state.tab='cal';X.render();
assert.ok(/data-tab="feed"[\s\S]*data-tab="feed"/.test(cache.root.innerHTML),
  'CTS ต้องเห็นแท็บแจ้งเตือนในแถบล่างด้วย ไม่ใช่แค่เมนูข้าง');

/* 34. ✓ Email Approved — Admin แตะได้จากปฏิทินตรงๆ และใช้กับคิวที่ CTS ลงเองได้ด้วย
      (เดิมมีปุ่มเฉพาะในหน้ารายละเอียด และเฉพาะคิวที่มาจากคำขอเท่านั้น) */
clean();
X.state.role='admin';X.state.me=null;X.state.tab='cal';X.state.view='week';
const selfEv={id:'SE-MK',date:K,dateEnd:'',allDay:false,title:'ประชุมทีม',detail:'',
  product:[],topics:[],attendees:[B1],owner:B1,start:'09:00',end:'11:00'};
X.state.selfEvents.push(selfEv);X.syncSelf(selfEv);
const wk=X.weekHTML();
assert.ok(/data-mailtag="S\|SE-MK\|"/.test(wk),'Admin ต้องแตะ ✓ ของคิวที่ CTS ลงเองได้จากปฏิทินเลย');
assert.ok(/class="okmk off tap/.test(wk),'ยังไม่ติ๊ก ต้องเป็น ✓ จางๆ ที่กดได้');
/* กดแล้วต้องติดธงและ ✓ เข้ม */
const je=X.entriesOf(K,B1)[0].job;
assert.strictEqual(X.mailTag(je),'S|SE-MK|','คิวที่ CTS ลงเองต้องมี tag แบบ S');
selfEv.emailOk=true;
assert.ok(/class="okmk tap/.test(X.weekHTML()),'ติ๊กแล้ว ✓ ต้องเข้มขึ้น');
assert.ok(X.entriesOf(K,B1)[0].job.emailOk,'ธงต้องถูกอ่านกลับมาที่คิวในปฏิทิน');
/* คนอื่นเห็น ✓ แต่กดไม่ได้ */
X.state.role='cts';X.state.me=B1;
const wkCts=X.weekHTML();
assert.ok(/class="okmk/.test(wkCts),'CTS ต้องเห็น ✓ ของคิวที่ Email Approved แล้ว');
assert.ok(!/data-mailtag=/.test(wkCts),'CTS ต้องกด ✓ ไม่ได้');
/* คิวที่ยังไม่ติ๊กต้องไม่โผล่ ✓ จางให้คนที่ไม่ใช่ Admin */
selfEv.emailOk=false;
assert.ok(!/class="okmk/.test(X.weekHTML()),'CTS ไม่ต้องเห็น ✓ จางของคิวที่ยังไม่ติ๊ก');

/* 35. CTS แก้คิวที่มาจากคำขอที่อนุมัติแล้วได้ — หัวข้อ เวลา ผู้ร่วมงาน (เหมือนคิวที่ลงเอง) */
clean();
const B2=X.BOOKABLE_CTS()[1].id;
X.state.role='cts';X.state.me=B1;X.state.tab='cal';X.state.view='week';
X.state.requests=[{id:'TR-E',team:'A',status:'approved',mode:'std',module:'MAX-Entry',product:['Ultherapy'],
  topic:'x',clinic:'คลินิกเดิม',map:'',doctors:1,exp:'',handsOn:false,photos:[],requester:'a',requesterId:'a',
  sessions:[{date:K,slot:'am',ctsId:B1,start:'09:00',end:'12:00'}]}];
const rq=X.state.requests[0], se=rq.sessions[0];
X.openJob(K,X.entriesOf(K,B1)[0].key);
assert.ok(/data-reqsess="TR-E\|0"/.test(sheet()),'คิวจากคำขอที่อนุมัติแล้วต้องมีปุ่มแก้ไข');
/* ยังไม่อนุมัติ ต้องยังไม่มีปุ่ม */
rq.status='pending';
X.openJob(K,X.entriesOf(K,B1)[0].key);
assert.ok(!/data-reqsess=/.test(sheet()),'คำขอที่ยังไม่อนุมัติ CTS ต้องยังแก้ไม่ได้');
rq.status='approved';
/* แก้หัวข้อ เวลา และเพิ่มคนที่ไปด้วย */
X.openReqSession('TR-E',0);
assert.ok(/rsTitle/.test(sheet())&&/data-rsa="/.test(sheet()),'ฟอร์มต้องมีช่องหัวข้อและปุ่มเลือกคน');
assert.ok(!new RegExp('data-rsa="'+B1+'"').test(sheet()),'ผู้เทรนหลักต้องกดเอาออกไม่ได้');
X.openReqSession('TR-E',0,{title:'ลงเครื่องใหม่',start:'10:00',end:'13:00',extra:[B2]});
G("rsTitle").value='ลงเครื่องใหม่';G("rsStart").value='10:00';G("rsEnd").value='13:00';
G("rsSave").onclick();
assert.strictEqual(se.sTitle,'ลงเครื่องใหม่','ต้องเก็บหัวข้อที่แก้');
assert.strictEqual(se.start+'-'+se.end,'10:00-13:00','ต้องเก็บเวลาที่แก้');
assert.deepStrictEqual(se.extra,[B2],'ต้องเก็บคนที่ไปด้วย');
/* ปฏิทินต้องโชว์หัวข้อใหม่ และคิวต้องขึ้นในตารางของคนที่เพิ่มเข้ามาด้วย */
const ent=X.entriesOf(K,B1)[0];
assert.strictEqual(ent.job.title,'ลงเครื่องใหม่','ปฏิทินต้องใช้หัวข้อที่แก้');
assert.strictEqual(ent.start+'-'+ent.end,'10:00-13:00','ปฏิทินต้องใช้เวลาที่แก้');
assert.strictEqual(X.entriesOf(K,B2).length,1,'คนที่ถูกเพิ่มต้องเห็นคิวนี้ในตารางตัวเอง');
assert.strictEqual(X.slotStatus(K,B2,'am'),'booked','คนที่ถูกเพิ่มต้องถูกตัดคิวว่างด้วย');
/* เอาออกแล้วคิวว่างต้องคืนให้เขา */
X.openReqSession('TR-E',0,{title:'ลงเครื่องใหม่',start:'10:00',end:'13:00',extra:[]});
G("rsTitle").value='ลงเครื่องใหม่';G("rsStart").value='10:00';G("rsEnd").value='13:00';
G("rsSave").onclick();
assert.strictEqual(X.slotStatus(K,B2,'am'),'free','เอาคนออกแล้วคิวว่างต้องคืนให้เขา');
assert.strictEqual(X.entriesOf(K,B1).length,1,'ผู้เทรนหลักต้องยังมีคิวอยู่');

/* 36. คิวที่อยู่แต่ในตาราง jobs (state.sched) — ย้ายมาจาก Sheet ไม่มีคำขอ ไม่ใช่งานที่ CTS ลงเอง
      เดิม dayEntries ไม่อ่าน sched เลย คิวพวกนี้เลยไม่โผล่ในปฏิทินหลัง migration */
clean();
X.state.role='cts';X.state.me=B1;X.state.tab='cal';X.state.view='week';
X.state.sched[K]={[B1]:{am:{kind:'booked',title:'OTOS',product:'OTOS',reqId:null,
  attendees:[B1],start:'09:00',end:'12:00'},pm:null}};
assert.strictEqual(X.entriesOf(K,B1).length,1,'คิวจากตาราง jobs ต้องขึ้นในปฏิทิน');
assert.strictEqual(X.entriesOf(K,B1)[0].job.title,'OTOS','ต้องใช้หัวข้อจากตาราง jobs');
assert.ok(/OTOS/.test(X.weekHTML()),'ปฏิทินรายสัปดาห์ต้องโชว์คิวจากตาราง jobs');
/* job เดียวที่คร่อมเที่ยงถูกเขียนลงทั้งช่องเช้าและบ่าย -> ต้องรวมเป็นอันเดียว */
const span={kind:'booked',title:'Belotero ทั้งวัน',product:'Belotero',reqId:null,
  attendees:[B1],start:'10:00',end:'15:00'};
X.state.sched[K][B1]={am:{...span},pm:{...span}};
const sp=X.entriesOf(K,B1);
assert.strictEqual(sp.length,1,'คิวคร่อมเที่ยงในตาราง jobs ต้องไม่ขึ้นซ้ำ 2 อัน');
assert.strictEqual(sp[0].start+'-'+sp[0].end,'10:00-15:00','ต้องใช้เวลาจริงของคิว');
/* คิวคนละงานเช้า/บ่าย ต้องยังแยกเป็น 2 อัน */
X.state.sched[K][B1]={am:{...span,title:'งานเช้า',end:'12:00'},pm:{...span,title:'งานบ่าย',start:'13:00'}};
assert.strictEqual(X.entriesOf(K,B1).length,2,'งานเช้ากับบ่ายคนละงานต้องขึ้นครบ 2 อัน');
/* คิวที่มาจากคำขอ (reqId) ถูกสร้างจาก state.requests อยู่แล้ว -> ห้ามนับซ้ำจาก sched */
clean();
X.state.requests=[{id:'TR-J',team:'A',status:'approved',mode:'std',module:'MAX-Entry',product:['Ultherapy'],
  topic:'x',clinic:'คลินิก',map:'',doctors:1,exp:'',handsOn:false,photos:[],requester:'a',requesterId:'a',
  sessions:[{date:K,slot:'am',ctsId:B1,start:'09:00',end:'12:00'}]}];
X.state.sched[K]={[B1]:{am:{kind:'booked',title:'คลินิก',product:'Ultherapy',reqId:'TR-J',
  attendees:[B1],start:'09:00',end:'12:00'},pm:null}};
assert.strictEqual(X.entriesOf(K,B1).length,1,'คิวจากคำขอต้องไม่ขึ้นซ้ำจากตาราง jobs');

/* 37. คิวที่อยู่แต่ในตาราง jobs (ไม่มี reqId/selfId) ต้องแก้ไข/ลบได้
      บั๊กจริง: หน้าคิวมีแต่ปุ่มแก้ที่ผูกกับ selfId / ปุ่มลบที่ผูกกับคำขอ -> คิวที่ย้ายมาจาก Sheet แก้ไม่ได้ ลบไม่ได้
      (พบวันที่ 9,20,21 ต.ค. และอีก 25 วัน — jobs มีแถว แต่ events ไม่มีแถว SE- คู่กัน) */
clean();
X.state.role='admin';X.state.me='admin';X.state.tab='cal';
const orp={kind:'busy',title:'Cadaveric Workshop',product:null,reqId:null,selfId:null,
  attendees:[B1,B2],start:'09:00',end:'16:30'};
X.state.sched[K]={[B1]:{am:{...orp},pm:{...orp}},[B2]:{am:{...orp},pm:{...orp}}};
const orpE=X.dayEntries(K).find(e=>e.job.title==='Cadaveric Workshop');
assert.ok(orpE,'คิวจากตาราง jobs ต้องขึ้นในปฏิทิน');
X.openJob(K,orpE.key);
assert.ok(/data-adopt=/.test(sheet()),'คิวจากตาราง jobs ต้องมีปุ่มแก้ไข/ลบ');
const sid=X.adoptJob(K,orpE.key);
assert.ok(sid,'ต้องแปลงเป็นคิว SE ได้');
assert.strictEqual(X.state.selfEvents.length,1,'ต้องได้ selfEvent 1 ใบ');
assert.strictEqual(X.dayEntries(K).length,1,'แปลงแล้วต้องไม่ขึ้นซ้ำ 2 อัน');
assert.deepStrictEqual(X.state.selfEvents[0].attendees,[B1,B2],'ต้องพาคนที่ไปด้วยกันมาครบ');
assert.strictEqual(X.state.selfEvents[0].start+'-'+X.state.selfEvents[0].end,'09:00-16:30','ต้องเก็บเวลาจริงของคิว');
/* กดลบ (ทางเดิมของหน้าจอ SE) แล้วต้องหายจากปฏิทินของทุกคน */
X.clearSelf(sid);X.state.selfEvents=X.state.selfEvents.filter(e=>e.id!==sid);
assert.strictEqual(X.dayEntries(K).length,0,'ลบแล้วต้องหายจากปฏิทินของทุกคน');
/* คิวที่มีต้นทางอยู่แล้ว ห้ามแปลงซ้ำ */
assert.strictEqual(X.adoptJob(K,'jb-'+B1+'-am'),null,'ไม่มี job แล้วต้องคืน null');

/* 38. กันขอคิวกระชั้น — sale ปกติ 5 วัน · UPC 14 วัน (นับจากวันนี้) */
clean();
const soon=d=>{const t=new Date();t.setDate(t.getDate()+d);
  return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');};
X.state.role='sales';X.state.area='Champion';X.state.salesId='C01';X.state.tbcMode=true;
assert.strictEqual(X.togglePick(soon(3),'am',null),true,'sale ปกติ ขอคิวด่วนได้ (ไม่โชว์คิวว่าง แต่กด Request ได้)');
X.state.picks=[];
assert.strictEqual(X.togglePick(soon(7),'am',null),true,'sale ปกติ 7 วันข้างหน้าขอได้');
X.state.picks=[];X.state.area='UPC';
assert.strictEqual(X.togglePick(soon(7),'am',null),false,'UPC ขอคิวภายใน 7 วันไม่ได้');
assert.strictEqual(X.togglePick(soon(20),'am',null),true,'UPC 20 วันข้างหน้าขอได้');
assert.strictEqual(X.togglePick(soon(20),'am',null),true,'เอาวันที่เลือกไว้แล้วออกได้เสมอ');
assert.strictEqual(X.state.picks.length,0,'เอาออกแล้วต้องไม่เหลือ');

/* 39. เจ้าของ KPI ของคิวที่ไปกันหลายคน + PS Area เข้า Dashboard */
clean();
X.state.role='cts';X.state.me=B1;
const kev={id:'SE-K1',date:K,dateEnd:'',allDay:false,start:'09:00',end:'12:00',title:'Ultherapy @คลินิก',
  detail:'',product:['Ultherapy'],topics:[],attendees:[B1,B2],owner:B1,clinic:'คลินิก',psArea:'W02'};
X.state.selfEvents.push(kev);X.syncSelf(kev);
let row=X.tpAllRows().filter(r=>r.date===K)[0];
assert.ok(row,'คิวที่ลงเองต้องเข้า Dashboard');
assert.strictEqual(row.cid,B1,'ไม่ได้ติด ✓ ใคร -> นับให้คนที่ลงคิวเหมือนเดิม');
assert.strictEqual(row.team,'Winner','PS Area W02 ต้องเข้าเป็นยอดของทีม Winner');
assert.strictEqual(row.area,'W02','ต้องเก็บรหัส PS Area ไว้ด้วย');
/* ติด ✓ ให้คนที่ 2 -> KPI ต้องย้ายไปคนนั้น และต้องมีคิวเดียวเท่านั้น ไม่นับซ้ำ */
kev.kpi=B2;X.syncSelf(kev);
const rows=X.tpAllRows().filter(r=>r.date===K);
assert.strictEqual(rows.length,1,'ติด ✓ แล้วต้องยังนับเป็น 1 คิว ไม่ใช่ 2');
assert.strictEqual(rows[0].cid,B2,'ต้องนับ KPI ให้คนที่ติด ✓');
/* ✓ ให้คนที่ไม่ได้ไปงานนี้ ไม่มีผล */
kev.kpi='belle';X.syncSelf(kev);
assert.strictEqual(X.tpAllRows().filter(r=>r.date===K)[0].cid,B1,'✓ คนที่ไม่ได้ไป ต้องไม่ถูกนับ');
assert.strictEqual(X.psTeam('KAE3'),'KA','KAE ต้องอยู่ทีม KA');
assert.strictEqual(X.psTeam('UPC5'),'UPC','UPC ต้องอยู่ทีม UPC');

const mkReq=(id,st,cid)=>({id,team:'A',status:st,mode:'std',module:'MAX-Entry',product:['Ultherapy'],
  topic:'x',ptopic:{Ultherapy:'ก'},clinic:'คลินิก',clinicType:'Single',map:'',doctors:1,exp:'',handsOn:false,
  photos:[],requester:'a',requesterId:'C01',area:'Champion',
  sessions:[{date:K,slot:'am',ctsId:cid,start:'09:00',end:'12:00',extra:[]}]});

/* 40. CTS รับทราบคิวที่ถูกจัดให้ + "คำขอของฉัน" เห็นเฉพาะใบที่ตัวเองเทรน */
clean();
const areq=mkReq('TR-A1','mgr',B1);
X.state.requests=[areq];
X.state.role='cts';X.state.me=B1;
assert.strictEqual(X.myRequests().length,1,'CTS ที่เป็นผู้เทรนต้องเห็นคำขอนี้');
assert.ok(X.needAck(areq),'CTS ที่ถูกจัดคิวต้องมีปุ่มรับทราบ');
X.state.me=B2;
assert.strictEqual(X.myRequests().length,0,'CTS ที่ไม่ได้เทรนใบนี้ต้องไม่เห็นในคำขอของฉัน');
assert.ok(!X.needAck(areq),'คนที่ไม่ได้เทรนต้องไม่มีปุ่มรับทราบ');
X.state.me=B1;X.ackReq('TR-A1');
assert.ok(areq.ack&&areq.ack[B1],'กดรับทราบแล้วต้องบันทึกเวลาไว้');
assert.ok(!X.needAck(areq),'รับทราบแล้วปุ่มต้องหาย');
assert.ok(X.ackedJob({reqId:'TR-A1',sIdx:0}),'คิวที่รับทราบแล้วต้องขึ้น ✓ แดงในปฏิทิน');
assert.ok(!X.ackedJob({reqId:'TR-A1',sIdx:1}),'session ที่ไม่มีอยู่ต้องไม่ขึ้น ✓ แดง');
X.state.role='admin';
assert.strictEqual(X.myRequests().length,1,'Admin เห็นทุกทีม');

/* 41. เปลี่ยนผู้เทรนหลักของคิวที่อนุมัติแล้ว (หัวหน้า / CTM / Admin) */
clean();
X.state.requests=[mkReq('TR-B1','approved',B1)];
const bs=X.state.requests[0].sessions[0];
X.state.role='admin';X.state.tab='cal';
X.openReqSession('TR-B1',0);
assert.ok(/id="rsMain"/.test(sheet()),'Admin ต้องเห็นช่องเปลี่ยนผู้เทรนหลัก');
G('rsMain').value=B2;G("rsTitle").value='';G("rsStart").value='09:00';G("rsEnd").value='12:00';
G("rsSave").onclick();
assert.strictEqual(bs.ctsId,B2,'ต้องเปลี่ยนผู้เทรนหลักได้');
assert.strictEqual(X.entriesOf(K,B2).length,1,'คิวต้องย้ายไปคนใหม่');
assert.strictEqual(X.entriesOf(K,B1).length,0,'คนเดิมต้องไม่เหลือคิวค้าง');
assert.ok((X.state.requests[0].trail||[]).some(t=>t.act==='changed-trainer'),'ต้องบันทึกร่องรอยการเปลี่ยนตัว');
/* CTS ธรรมดาเปลี่ยนไม่ได้ */
X.state.role='cts';X.state.me=B1;
X.openReqSession('TR-B1',0);
assert.ok(!/id="rsMain"/.test(sheet()),'CTS ธรรมดาต้องไม่เห็นช่องเปลี่ยนผู้เทรนหลัก');

/* 42. Sale UPC — เลือก product ก่อน -> เห็น CTS ที่ไปได้ -> ปฏิทินโชว์วันว่างเป็นรายวัน */
clean();
X.state.role='sales';X.state.area='UPC';X.state.salesId='UPC1';X.state.authed=true;X.state.tab='cal';
X.state.upcProd=[];X.state.upcCts=null;X.state.upcPick=[];
const kof=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const workday=n=>{const d=new Date();d.setDate(d.getDate()+n);
  let g=0;while((d.getDay()===0||X.holidayOf(kof(d)))&&g++<40)d.setDate(d.getDate()+1);return kof(d);};
assert.strictEqual(X.upcAble().length,0,'ยังไม่เลือก product ต้องยังไม่มี CTS ให้เลือก');
X.state.upcProd=['Ultherapy'];
assert.strictEqual(X.upcAble().length,2,'ยังไม่เปิด Skills — เหลือแค่หัวหน้า PAM/MILK ที่ UPC ขอไปได้');
X.BOOKABLE_CTS().forEach(c=>X.setSkill(c.id,'Ultherapy','self'));
assert.strictEqual(X.upcAble().length,8,'เปิด Skills ครบ ต้องเลือกได้ 6 คน + หัวหน้า 2 คน');
const U=workday(20);
X.state.upcCts=B1;
assert.ok(X.upcFree(U,B1),'วันทำงานที่ว่างทั้งวันต้องกดเลือกได้');
assert.ok(!X.upcFree(workday(3),B1),'วันที่ยังไม่ถึง 14 วัน ต้องเลือกไม่ได้ (กติกา UPC)');
X.state.sched[U]={[B1]:{am:{kind:'busy',title:'x',attendees:[B1],start:'09:00',end:'12:00'},pm:null}};
assert.ok(!X.upcFree(U,B1),'ติดคิวครึ่งเช้า = ไม่นับว่าว่างทั้งวัน');
X.state.sched[U]=undefined;

/* 43. คำขอ UPC — product หลายตัว + หัวข้อราย product + hands-on ราย product */
const mkIt=()=>({province:'เชียงใหม่',clinic:'ค',clinicType:'Single',map:'m',module:'MAX-Entry',level:'Standard',
  product:['Ultherapy','Xeomin'],ptopic:{},topic:'',doctors:2,exp:'x',handsOn:false,ho:{},photos:[],start:'09:00',end:'16:30'});
const it=mkIt();
const missOf=()=>X.upcMissing({days:[{date:U,items:[it]}],requester:'ก'});
assert.ok(missOf().some(x=>/หัวข้อของ Ultherapy/.test(x)),'ต้องบังคับหัวข้อทีละ product');
assert.ok(missOf().some(x=>/หัวข้อของ Xeomin/.test(x)),'ครบทุก product ที่เลือก');
it.ptopic={Ultherapy:'a',Xeomin:'b'};
/* ประเภทคลินิกต้องกรอกเหมือนคำขอปกติ — ตาราง raw data ต้องมีช่อง Type ของคิว UPC ด้วย */
it.clinicType='';assert.ok(missOf().some(x=>/ประเภทคลินิก/.test(x)),'รายการ UPC ต้องบังคับประเภทคลินิก');
it.clinicType='Single';
assert.strictEqual(missOf().length,0,'กรอกครบแล้วต้องผ่าน');
it.handsOn=true;
assert.ok(missOf().some(x=>/hands-on/.test(x)),'hands-on ต้องกรอกเคสอย่างน้อย 1 product');
it.ho={Ultherapy:{cases:'2',detail:'1.5cc x2'}};it.photos=[{url:'x'}];
assert.strictEqual(missOf().length,0,'กรอกเคส+รูปแล้วต้องผ่าน');

/* 44. Sale UPC ส่งคำขอ -> เข้า SM ก่อน และล็อก CTS ที่เลือกไว้ */
X.state.requests=[];
X.submitUPC({from:U,to:U,cts:B1,days:[{date:U,items:[mkIt()]}],requester:'ก'});
const ur=X.state.requests[0];
assert.strictEqual(ur.status,'sm','Sale UPC ต้องเด้งไป SM UPC ก่อน เหมือน Sale ปกติ');
assert.strictEqual(ur.sessions[0].ctsId,B1,'ต้องล็อก CTS ที่ Sale เลือกไว้');
assert.ok((ur.trail||[]).some(t=>t.act==='request'),'ต้องบันทึกร่องรอยการส่งคำขอ');
assert.strictEqual(X.state.upcPick.length,0,'ส่งแล้วต้องล้างวันที่เลือกไว้');

/* 45-47. ยกมาจาก check.js ที่เลิกใช้ — 3 ข้อนี้ยังคุมของจริงหลังย้าย Supabase
      ที่เหลือใน check.js เทส API / mergeState / save() ยิง POST ของยุค GAS ซึ่งถูกลบไปแล้ว */
clean();
/* 45. SAVED = คีย์ที่ save() ใช้เทียบว่ามีอะไรเปลี่ยน (index.html: JSON.stringify(snap()))
      ลืมใส่คีย์ที่บันทึกจริง -> แก้แล้ว save ไม่ยิง · ใส่สถานะหน้าจอเข้าไป -> ยิงรัวไม่จบ */
const s1=JSON.stringify(X.snap());
assert.strictEqual(JSON.stringify(Object.keys(JSON.parse(s1)).sort()),JSON.stringify(X.SAVED.slice().sort()),
  'snapshot key ไม่ครบตาม SAVED');
Object.assign(X.state,JSON.parse(s1));
assert.strictEqual(JSON.stringify(X.snap()),s1,'round-trip แล้วข้อมูลเพี้ยน (มี Set/Date ปนอยู่)');
['tab','filter','draft','loginRole','month','picks','pw','auth','upcProd','upcCts','upcPick'].forEach(k=>
  assert.ok(!X.SAVED.includes(k),k+' เป็นสถานะหน้าจอ ไม่ควรอยู่ใน SAVED'));

/* 46. id ใหม่ต้องไม่ชนแม้ seq เดียวกัน (สองเครื่องเดินเลขของตัวเองไปก่อน — บั๊ก 1 ก.ย.) */
const ids=new Set();for(let i=0;i<200;i++)ids.add(X.newId('TR',1041));
assert.ok(ids.size>100,'id เลขเดียวกันต้องกระจาย ไม่ใช่ซ้ำกันหมด');
assert.ok([...ids].every(v=>/^TR-1041[A-Z]{2}$/.test(v)),'รูปแบบ id เพี้ยน');

/* 47. รหัสผ่านต้องไม่ถูกฝังในไฟล์ที่ push ขึ้น repo สาธารณะ */
['index.html','sw.js','manifest.json'].forEach(f=>
  assert.ok(!/cts1234/i.test(fs.readFileSync(f,'utf8')),f+' มีรหัสผ่านฝังอยู่'));
assert.ok(X.TODAY.toDateString()===new Date().toDateString(),'TODAY ต้องเป็นวันนี้จริง');



/* 48. UPC + Train with Senior — บั๊กที่เต้เจอ (Atom/Eye ไม่ขึ้นวันว่างทั้งที่มี Senior ไปด้วยได้)
   freeIds() เป็นตัวนับรวมของฝั่ง Sales: TwS ถูก slice ตามจำนวนหัวหน้าที่ว่าง ตัดตามลำดับในรายชื่อ
   upcFree() ถามคนเดียว จึงต้องเช็คตรงๆ ว่ามีหัวหน้าว่างไหม ไม่ใช่ไปดูคิวรวม */
clean();
X.state.role='sales';X.state.area='UPC';X.state.salesId='UPC1';X.state.authed=true;
X.state.upcProd=['Ultherapy'];X.state.upcPick=[];
const tws=X.BOOKABLE_CTS().filter(c=>!X.LEAD_IDS.includes(c.id));
tws.forEach(c=>X.setSkill(c.id,'Ultherapy','senior'));      // ทุกคนเป็น Train with Senior
X.LEAD_IDS.forEach(id=>X.setSkill(id,'Ultherapy','self'));
const U2=workday(20);
tws.forEach(c=>assert.ok(X.upcFree(U2,c.id),c.id+' เป็น TwS และหัวหน้าว่าง ต้องขึ้นวันว่าง'));
assert.ok(tws.length>X.seniorsFree(U2,'am').length,'ต้องมี TwS มากกว่าจำนวนหัวหน้า เทสนี้จึงมีความหมาย');
/* หัวหน้าติดงานทั้งคู่ = TwS ไปไม่ได้จริง */
X.state.sched[U2]={};
X.LEAD_IDS.forEach(id=>X.state.sched[U2][id]={am:{kind:'busy',title:'x',attendees:[id],start:'09:00',end:'12:00'},
  pm:{kind:'busy',title:'x',attendees:[id],start:'13:00',end:'16:30'}});
tws.forEach(c=>assert.ok(!X.upcFree(U2,c.id),c.id+' เป็น TwS แต่หัวหน้าไม่ว่าง ต้องไม่ขึ้นวันว่าง'));
X.state.sched[U2]=undefined;

/* 49. งานกลาง MA / วันหยุด ต่อเนื่องหลายวัน -> กล่องเดียว + ช่วงวันที่ */
const R=X.runsOf([{id:'E1',date:'2026-10-05',title:'Workshop',type:'Workshop'},
                  {id:'E2',date:'2026-10-06',title:'Workshop',type:'Workshop'},
                  {id:'E3',date:'2026-10-07',title:'Workshop',type:'Workshop'},
                  {id:'E4',date:'2026-10-09',title:'Workshop',type:'Workshop'},
                  {id:'E5',date:'2026-10-06',title:'Symposium',type:'Symposium'}],X.maSid);
assert.strictEqual(R.length,3,'5 แถว -> 3 กล่อง (ติดกัน 3 วัน · เว้นวัน 1 · คนละงาน 1)');
assert.strictEqual(R[0].items.length,3,'3 วันติดกันต้องรวมเป็นกล่องเดียว');
assert.strictEqual(R[0].from+'..'+R[0].to,'2026-10-05..2026-10-07','ช่วงวันที่ของกล่องรวมต้องถูก');
assert.ok(/–/.test(X.spanLabel(R[0]))&&/3 วัน/.test(X.spanLabel(R[0])),'ป้ายต้องบอกวันที่เท่าไหร่ถึงเท่าไหร่');
assert.ok(!/–/.test(X.spanLabel(R[1])),'งานวันเดียวต้องไม่มีขีดช่วง');

/* 50. แถบสีลากยาวของงานกลาง/วันหยุดในปฏิทิน — คร่อมวันจริง และช่องที่ถูกกินต้องไม่วาดชิปซ้ำ */
const wkc=['2026-10-04','2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10']
  .map((k,i)=>({k,hol:i>=4&&i<=5?{date:k,name:'หยุดยาว'}:null,
    ma:(i>=1&&i<=2)?[{id:'E'+i,date:k,title:'Workshop',type:'Workshop'}]:[]}));
const MS=X.maSpans(wkc);
assert.strictEqual(MS.bars.length,2,'ต้องได้ 2 แถบ (งานกลาง 2 วัน + วันหยุด 2 วัน)');
assert.ok(MS.bars.some(b=>b.c0===1&&b.n===2),'แถบงานกลางต้องเริ่มคอลัมน์ 1 กว้าง 2 วัน');
assert.ok(MS.bars.some(b=>b.c0===4&&b.n===2),'แถบวันหยุดต้องเริ่มคอลัมน์ 4 กว้าง 2 วัน');
assert.ok(MS.skip.has('1|evE1')&&MS.skip.has('4|hol'),'ช่องที่ถูกแถบกินต้องอยู่ใน skip');
assert.strictEqual(MS.lanes,1,'2 แถบที่ไม่ทับกันใช้เลนเดียวได้');

/* 51. BELLE อนุมัติขั้นสุดท้าย -> สถานะ/โน้ตต้องเป็น "อนุมัติครบ" ไม่ค้างว่ารอ BELLE */
clean();
X.state.role='cts';X.state.authed=true;
const fr={id:'TR-FIN',status:'pending',team:'A',area:'C01',mode:'normal',product:'Ultherapy',clinic:'ค',
  requester:'ก',sessions:[{date:workday(20),slot:'am',ctsId:B1}],trail:[],module:'MAX-Entry',level:'Standard',
  topic:'t',map:'m',doctors:2,exp:'x',photos:[],ack:{},created:new Date()};
X.state.requests=[fr];
X.state.me=X.LEAD_IDS[0];fr._ack=true;X.approve('TR-FIN');
assert.strictEqual(fr.status,'mgr','Senior Leader อนุมัติ -> ส่งต่อ CTM');
assert.ok(/รอ.*อนุมัติขั้นสุดท้าย/.test(fr.note),'ขั้นนี้โน้ตต้องบอกว่ารอ CTM');
X.state.me='belle';fr._ack=true;X.approve('TR-FIN');
assert.strictEqual(fr.status,'approved','BELLE อนุมัติ -> approved');
assert.strictEqual(X.ST_LABEL.approved,'Approved','ป้ายสถานะต้องเป็น "Approved"');
assert.ok(!/รอ.*อนุมัติขั้นสุดท้าย/.test(fr.note),'โน้ตขั้นก่อนหน้าต้องถูกเขียนทับ ไม่ค้าง');
assert.ok(/อนุมัติครบ/.test(fr.note),'โน้ตหลังอนุมัติครบต้องบอกว่าอนุมัติครบ');

/* 52. คิวที่อนุมัติแล้วต้องเด้งเป็นแจ้งเตือนในแท็บ "คำขอ" ของ CTS คนนั้น จนกว่าจะกดรับทราบ */
X.state.me=B1;
assert.strictEqual(X.ackList().length,1,'CTS ที่ถูกจัดให้ต้องเห็นคิวค้างรับทราบ 1 ใบ');
assert.ok(X.badgeCount()>0,'ป้ายตัวเลขต้องนับคิวที่ยังไม่รับทราบ');
X.ackReq('TR-FIN');
assert.strictEqual(X.ackList().length,0,'กดรับทราบแล้วต้องหายจากรายการ');
X.state.me=X.CTS[1].id;
assert.strictEqual(X.ackList().length,0,'CTS คนอื่นต้องไม่เห็นคิวของคนนี้');



/* ================================================================
   53-58. ทริป UPC หลายวัน หลายคลินิกต่อวัน
   บั๊กที่คุม: SM/หัวหน้าเห็นกล่องคำขอว่างเปล่า · hands-on ไม่เด่น ·
               คิวถูกจัดให้ Senior Leader (FK พัง -> "บันทึกไม่สำเร็จ") ·
               KPI นับให้แค่คลินิกแรกของวัน
   ================================================================ */
clean();
X.state.role='sales';X.state.area='UPC';X.state.salesId='UPC1';X.state.authed=true;
const UD1=workday(20),UD2=workday(25);
const uItem=o=>({province:'เชียงใหม่',clinic:'คลินิกเอ',map:'m',module:'MAX-Entry',level:'Standard',
  product:['Ultherapy'],ptopic:{Ultherapy:'a'},topic:'Ultherapy: a',doctors:2,exp:'x',
  handsOn:false,ho:{},hoProduct:'',hoCases:'',photos:[],start:'09:00',end:'12:00',...o});
X.state.requests=[];
X.submitUPC({from:UD1,to:UD2,cts:null,requester:'ก',days:[
  {date:UD1,items:[uItem({}),
    uItem({clinic:'คลินิกบี',product:['Xeomin','Belotero Balance'],ptopic:{Xeomin:'b'},topic:'Xeomin: b',
      doctors:3,handsOn:true,ho:{Xeomin:{cases:'2',detail:'50u'}},hoProduct:'Xeomin 2 เคส (50u)',hoCases:'2',
      start:'13:00',end:'16:30'})]},
  {date:UD2,items:[uItem({clinic:'คลินิกซี',product:['Radiesse Plus'],ptopic:{},topic:'Radiesse: c'})]}]});
const UT=X.state.requests[0];

/* 53. จัดคิวได้เฉพาะ CTS ที่รับคิวได้ — Senior Leader/Supervisor ไม่มีแถวใน profiles บ้าง ทำให้ FK พัง */
UT.sessions.forEach(sn=>assert.ok(X.isBookable(sn.ctsId),
  'คิว UPC ต้องจัดให้ CTS ที่รับคิวได้ ไม่ใช่ Senior Leader/Supervisor'));

/* 54. กล่องคำขอฝั่ง SM ต้องโชว์ product · หัวข้อ · คลินิก · จำนวนแพทย์ เหมือนคำขอปกติ */
const smh=X.smReqCard(UT,true);
['Ultherapy','Xeomin','คลินิกเอ','คลินิกบี','คลินิกซี','Ultherapy: a'].forEach(x=>
  assert.ok(smh.includes(x),'กล่องคำขอฝั่ง SM ต้องโชว์ '+x));
assert.ok(/7 ท่าน/.test(smh),'กล่อง SM ต้องรวมจำนวนแพทย์ทั้งทริป (2+3+2)');

/* 55. Hands-on ต้องเด่นเป็นตัวหนังสือม่วง บอกจำนวนเคสและ product ที่ขอ support */
const uc=X.upcCard(UT,false);
assert.ok(/class="hoflag"/.test(uc)&&/class="hoflag"/.test(smh),'วันที่มี hands-on ต้องมีป้ายม่วง');
assert.ok(/class="hotx"/.test(uc),'รายการ hands-on ต้องเป็นตัวหนังสือม่วง');
assert.ok(/Hands-on 2 เคส/.test(uc),'ต้องบอกจำนวนเคส hands-on');
assert.ok(/Xeomin 2 เคส/.test(uc),'ต้องบอก product ที่ขอ support');

/* 56. คิว UPC ในปฏิทิน CTS ต้องรวม product ของทั้งวัน ไม่ใช่แค่คลินิกแรก */
UT.status='approved';X.bookUPC(UT);
const uent=X.dayEntries(UD1,X.CTS.map(c=>c.id)).find(e=>e.job&&e.job.reqId===UT.id);
assert.ok(uent,'คิว UPC ที่อนุมัติแล้วต้องขึ้นในปฏิทิน CTS');
['Ultherapy','Xeomin','Belotero Balance'].forEach(p=>
  assert.ok(X.prodList(uent.job.product).includes(p),'คิว UPC ต้องรวม product ของทั้งวัน: '+p));

/* 57. Dashboard — วันเดียวเทรน 2 ที่ 3 product ต้องนับ KPI ให้ครบ */
const urows=X.tpAllRows().filter(r=>r.date===UD1);
assert.strictEqual(urows.length,2,'วันเดียวเทรน 2 คลินิก ต้องนับเป็น 2 คิว');
assert.strictEqual(urows.map(r=>r.clinic).sort().join('|'),'คลินิกบี|คลินิกเอ','ต้องแยกตามคลินิกจริง');
assert.strictEqual([...new Set(urows.flatMap(r=>r.products))].sort().join('|'),
  'Belotero|Ultherapy|Xeomin','ต้องนับ product ครบทุกตระกูลที่ออกเทรนวันนั้น');
assert.strictEqual(urows.reduce((n,r)=>n+r.doctors,0),5,'จำนวนแพทย์ต้องรวมทุกคลินิกในวันนั้น');

/* 58. CTS แก้คิว UPC ได้เหมือนคิวปกติ — หัวข้อที่แก้ต้องลงทั้งช่องเช้าและบ่าย */
X.state.role='cts';X.state.me=X.LEAD_IDS[0];
X.openReqSession(UT.id,0);
assert.ok(/id="rsTitle"/.test(sheet()),'คิว UPC ต้องเปิดหน้าแก้ไขคิวงานได้');
UT.sessions[0].sTitle='ทริปเชียงใหม่';X.bookUPC(UT);
['am','pm'].forEach(sl=>assert.strictEqual(X.jobOf(UD1,UT.sessions[0].ctsId,sl).title,'ทริปเชียงใหม่',
  'หัวข้อที่แก้ต้องขึ้นทั้งช่องเช้าและบ่าย'));
X.state.me=UT.sessions[0].ctsId;
const uee=X.dayEntries(UD1,X.CTS.map(c=>c.id)).find(e=>e.job&&e.job.reqId===UT.id);
X.openJob(UD1,uee.key);
assert.ok(/คลินิกบี/.test(sheet()),'กดคิว UPC ในปฏิทินต้องเห็นคลินิกที่เทรนวันนั้นครบ');
assert.ok(/class="hotx"/.test(sheet()),'กดคิว UPC ต้องเห็น hands-on สีม่วง');
assert.ok(/data-reqsess/.test(sheet()),'คิว UPC ต้องมีปุ่มแก้ไขคิวเหมือนคิวปกติ');

/* 59. Dashboard ฝั่งขาย (Sale/SM) — ทริป UPC ต้องนับรายคลินิก
      เดิม r.clinic/r.product ของคำขอ UPC ว่าง -> ได้ 1 training คลินิก "—" และ 0 ทุก product */
X.state.dash={from:UD1,to:UD2};
const srows=X.saleRows(['UPC1']);
assert.strictEqual(srows.length,3,'ทริป UPC 3 คลินิก ต้องนับ 3 training ในฝั่งขาย');
assert.ok(!srows.some(x=>x.clinic==='—'),'ต้องได้ชื่อคลินิกจริง ไม่ใช่ "—"');
assert.strictEqual([...new Set(srows.flatMap(x=>x.fams))].sort().join('|'),
  'Belotero|Radiesse|Ultherapy|Xeomin','product ฝั่งขายต้องมาจากราย item ของ UPC');
assert.strictEqual(srows.filter(x=>x.sup.length).length,1,
  'hands-on ต้องนับเฉพาะคลินิกที่ขอ ไม่กระจายซ้ำทุกแถว');


/* 60. KPI ของ UPC ต้องอยู่ครบหลังบันทึกลง DB แล้วโหลดกลับมา (toRow -> jsonb -> fromRow)
      เดิม fromRow คืน product=[] ซึ่งเป็น truthy -> s.sProduct||r.product ตัดจบตรงนั้น
      ไม่ตกไปใช้ product รวมของทั้งวัน -> Training Pulse ไม่เห็นคิว UPC เลยหลังรีเฟรช */
const rtRow=JSON.parse(JSON.stringify(X.toRow(UT)));
assert.ok(rtRow.client&&rtRow.client.days,'product ราย item ต้องถูกเก็บใน client.days');
X.state.requests=[X.fromRow(rtRow)];
const rtRows=X.tpAllRows().filter(r=>r.date===UD1);
assert.strictEqual(rtRows.length,2,'โหลดกลับมาแล้ว วันที่เทรน 2 คลินิก ต้องยังนับ 2 คิว');
assert.strictEqual([...new Set(rtRows.flatMap(r=>r.products))].sort().join('|'),
  'Belotero|Ultherapy|Xeomin','product ต้องครบเท่าเดิมหลังโหลดกลับ');
assert.strictEqual([...new Set(rtRows.map(r=>r.cts))].join('|'),X.CTS.find(c=>c.id===UT.sessions[0].ctsId).nick,
  'KPI ต้องยังนับให้ CTS คนเดิมที่ถูกจัดให้');

/* ================= รอบ "UPC เห็นผู้เทรน · เปลี่ยนตัวผู้เทรน · Dashboard ฝั่งขาย · ตารางข้อมูลดิบ" ================= */
const UREQ=X.state.requests[0];           // ทริป UPC ที่โหลดกลับมาจาก DB ในข้อ 60

/* 61. ปฏิทิน SM ต้องขึ้นชื่อคลินิกของวันนั้น ไม่ใช่รหัส TR- (คำขอ UPC เก็บคลินิกไว้ราย item) */
assert.ok(!X.reqClinicOn(UREQ,UD1).includes('TR'),'คำขอ UPC ต้องคืนชื่อคลินิก ไม่ใช่รหัสคำขอ');
assert.strictEqual(X.reqClinicOn(UREQ,UD1),'คลินิกเอ · คลินิกบี','ต้องรวมทุกคลินิกที่เทรนวันนั้น');
const smc=X.smChip({r:UREQ,s:UREQ.sessions[0],i:0,code:'UPC1'},true);
assert.ok(smc.includes('คลินิกเอ'),'ชิปในปฏิทิน SM ต้องโชว์ชื่อคลินิก');
assert.ok(!/TR\d/.test(smc),'ชิปในปฏิทิน SM ต้องไม่ขึ้นแค่รหัส TR-');

/* 62. กล่องคำขอ UPC ต้องโชว์รูป + สีประจำตัวของ CTS เหมือนคำขอของ Sale/KAE */
X.state.role='cts';X.state.me=X.LEAD_IDS[0];
const udb=X.upcDayBox(UREQ,true);
assert.ok(/class="ctschip"/.test(udb),'กล่องวันของ UPC ต้องมีชิป CTS');
assert.ok(/class="ava xs"/.test(udb),'ชิป CTS ของ UPC ต้องมีรูป');
assert.ok(/--c:#/.test(udb),'ชิป CTS ของ UPC ต้องใช้สีประจำตัว');

/* 63. แถวข้อมูลดิบต้องมีครบทุกช่องที่ต้อง Record — รหัส Sale · Sub-Team · Module · ระดับ · Hands-on ราย product */
const dr=X.tpAllRows().find(r=>r.date===UD1);
assert.strictEqual(dr.code,'UPC1','แถว Dashboard ต้องรู้ว่าเป็นคิวของรหัส Sale ไหน');
assert.ok(/Team [AB]/.test(dr.sub),'ต้องรู้ Sub-Team (Team A/B) ของ CTS');
assert.ok(dr.detail.length&&dr.detail.every(d=>'ho' in d),'ต้องรู้ว่าแต่ละ product มี hands-on ไหม');
const tb=X.tpTableRows(X.tpAllRows().filter(r=>r.date===UD1));
assert.strictEqual(X.TP_TCOLS.length,21,'ตารางต้องมี 21 คอลัมน์ (Province + Product 1-4 + Hands-on 1-4)');
/* จังหวัดมีเฉพาะคำขอ UPC ที่กรอกไว้ราย item — คิวอื่นต้องเป็น - ไม่ใช่ช่องว่าง */
assert.ok(tb.every(row=>row[X.TP_TCOLS.indexOf('Province')]),'ทุกแถวต้องมีค่าในช่อง Province');
assert.ok(tb.some(row=>row[X.TP_TCOLS.indexOf('Province')]==='เชียงใหม่'),'คิว UPC ต้องบันทึกจังหวัดที่กรอกไว้');
tb.forEach(row=>assert.strictEqual(row.length,X.TP_TCOLS.length,'จำนวนช่องต้องเท่าหัวตาราง'));
assert.ok(tb.some(row=>row.includes('Yes')),'คลินิกที่ขอ hands-on ต้องขึ้น Yes');
assert.ok(tb.some(row=>row.includes('No')),'product ที่ไม่ได้ขอ hands-on ต้องขึ้น No');

/* 64. Dashboard ฝั่งขาย — Sale เห็นแค่รหัสตัวเอง ไม่มี By PS Team · SM เห็นทั้งทีมและยังมี By PS Team */
X.state.role='sales';X.state.salesId='UPC1';X.state.area='UPC';
assert.strictEqual(X.dashScope().codes.join(','),'UPC1','Sale ต้องเห็นเฉพาะรหัสตัวเอง');
X.renderDash();
let dh=G('view').innerHTML;
assert.ok(dh.includes('By Sale (Individual)'),'Dashboard ของ Sale ต้องเป็น By Sale (Individual)');
assert.ok(!dh.includes('By CTS (Individual)'),'Dashboard ของ Sale ต้องไม่มี By CTS');
assert.ok(!dh.includes('By PS Team'),'Dashboard ของ Sale ต้องไม่มี By PS Team');
assert.ok(dh.includes('ดูรายละเอียดข้อมูลการเทรนแบบตาราง'),'ต้องมีปุ่มเปิดตารางข้อมูลดิบ');
X.state.role='sm';X.state.sm='UPC';
assert.ok(X.dashScope().codes.includes('UPC6'),'SM ต้องเห็นทุกรหัสในทีมตัวเอง');
X.renderDash();
dh=G('view').innerHTML;
assert.ok(dh.includes('By Sale (Individual)')&&dh.includes('By PS Team'),'Dashboard ของ SM ต้องมีทั้ง By Sale และ By PS Team');
X.state.role='cts';X.state.me=X.LEAD_IDS[0];
X.renderDash();
assert.ok(G('view').innerHTML.includes('By CTS (Individual)'),'Dashboard ของ CTS ต้องยังเป็น By CTS');

/* 65. คิวที่ CTS ลงเองและเลือก PS Area ต้องเข้า Dashboard ของรหัสนั้น */
X.state.selfEvents=[{id:'SE9',date:UD1,dateEnd:'',allDay:true,title:'เทรนเอง',attendees:[OTHER],owner:OTHER,
  product:['Ultherapy'],ptopic:{Ultherapy:'Ultherapy Legacy'},clinic:'คลินิกลงเอง',clinicType:'Single',
  module:'MAX-Entry',level:'Standard',doctors:1,psArea:'C01'}];
const selfRow=X.tpAllRows().find(r=>r.clinic==='คลินิกลงเอง');
assert.ok(selfRow,'คิวที่ CTS ลงเองและมี product ต้องเข้า Dashboard');
assert.strictEqual(selfRow.code,'C01','ต้องนับให้รหัส Sale ที่เลือกไว้ใน PS Area');
assert.strictEqual(selfRow.team,'Champion','ต้องเข้า Dashboard ของ SM ทีมนั้นด้วย');

/* 66. Senior Leader เปลี่ยนตัวผู้เทรนหลังอนุมัติแล้ว — คิวย้ายจริง · ลบรับทราบของคนเก่า · แจ้งเตือนให้คนใหม่กดรับทราบ */
const SWD=FUT(60),NEW=X.BOOKABLE_CTS()[1].id,OLD=X.BOOKABLE_CTS()[0].id;
const SW={id:'TR9001',team:'A',area:'Champion',requesterId:'C01',requester:'เทสสลับตัว',status:'approved',
  created:new Date(),product:['Ultherapy'],ptopic:{Ultherapy:'Ultherapy Legacy'},clinic:'คลินิกสลับตัว',
  clinicType:'Single',module:'MAX-Entry',level:'Standard',doctors:2,photos:[],trail:[],ack:{[OLD]:'x'},
  sessions:[{date:SWD,slot:'am',ctsId:OLD,start:'09:00',end:'12:00'}]};
X.state.requests=[SW];X.state.feed=[];
X.state.role='cts';X.state.me=X.LEAD_IDS[0];
assert.ok(X.canSwapCts(SW),'Senior Leader ต้องเปลี่ยนตัวผู้เทรนของคิวที่อนุมัติแล้วได้');
X.assign(SW.id);
G('sheetBody').querySelectorAll=sel=>sel==='[data-sess]'?[{dataset:{sess:'0'},value:NEW}]:[];
G('saveRe').onclick();
assert.strictEqual(SW.sessions[0].ctsId,NEW,'ผู้เทรนต้องถูกเปลี่ยนเป็นคนใหม่');
assert.ok(!SW.ack[OLD],'ต้องลบสถานะรับทราบของคนเก่าทิ้ง');
assert.strictEqual(X.jobOf(SWD,NEW,'am').kind,'booked','คิวของคนใหม่ต้องเป็น booked ไม่ใช่ pend');
assert.strictEqual(X.jobOf(SWD,OLD,'am'),null,'คิวของคนเก่าต้องถูกปล่อยคืน');
X.state.me=NEW;
assert.ok(X.needAck(SW),'CTS คนใหม่ต้องถูกขอให้กดรับทราบ');
assert.strictEqual(X.state.feed[0].kind,'changed','ต้องแจ้งเตือนฝั่งขายว่ามีการเปลี่ยนผู้เทรน');
assert.ok((SW.trail||[]).some(t=>/เปลี่ยนผู้เทรน/.test(t.note||'')),'ต้องบันทึกหลักฐานการเปลี่ยนตัวใน Approval Tracking');

/* 67. ตาราง Record ดิบ — ทุกคำขอ + Approval Status Tracking */
X.state.role='admin';
const rrows=X.recTableRows(X.state.requests);
assert.strictEqual(rrows.length,1,'ต้องได้ 1 แถวต่อ 1 คำขอ');
assert.strictEqual(rrows[0].length,X.REC_COLS.length,'จำนวนช่องต้องเท่าหัวตาราง Record');
assert.ok(rrows[0][0]==='TR9001'&&rrows[0].includes('คลินิกสลับตัว'),'ตาราง Record ต้องมีข้อมูลของคำขอ');
assert.ok(/เปลี่ยนผู้เทรน/.test(rrows[0][X.REC_COLS.length-1]),'ช่องสุดท้ายต้องเป็น Approval Status Tracking');

/* 68. ไฟล์ CSV ต้องมี BOM (Excel อ่านภาษาไทยออก) และครอบ escape ค่าที่มีคอมมา/อัญประกาศ */
const cz=X.csvText(['a','b'],[['คลินิก, สาขา','เขา "ว่า" ดี']]);
assert.ok(cz.charCodeAt(0)===0xFEFF,'CSV ต้องขึ้นต้นด้วย BOM ไม่งั้น Excel อ่านภาษาไทยเพี้ยน');
assert.ok(cz.includes('"คลินิก, สาขา"'),'ค่าที่มีคอมมาต้องถูกครอบด้วยอัญประกาศ');
assert.ok(cz.includes('"เขา ""ว่า"" ดี"'),'อัญประกาศในค่าต้องถูก escape เป็น ""');

/* 69. Support Product — รวมรายตระกูลด้านบน + แตกรายคลินิกด้านล่าง */
const sup=(clinic,ctype,p,cases,extra)=>Object.assign(
  {clinic,clinicType:ctype,products:[p],date:'2027-01-0'+(extra&&extra.d||1),code:'C01',cts:'POP',
   module:'MAX-A',level:'Standard',reqId:'TR-9100',
   detail:[Object.assign({p,ho:true,cases,topic:'',note:''},extra&&extra.det||{})]},extra&&extra.row||{});
const SUP=[
  sup('คลินิกเอ','Single','Ultherapy',2,{d:1,det:{note:'1.5cc x2'}}),
  sup('คลินิกเอ','Single','Xeomin',3,{d:2}),
  sup('คลินิกบี','Chain','Ultherapy',9,{d:3}),
  sup('คลินิกซี','','Belotero',0,{d:4}),
  sup('คลินิกดี','','Radiesse',9,{d:5,det:{ho:false}})];
const sh=X.tpSupHTML(SUP);
assert.ok(/Ultherapy<\/b><em>2<\/em>/.test(sh),'Ultherapy ขอ support 2 คิว — ตัวเลขต้องเป็นจำนวนคิว ไม่ใช่ 11 เคส');
assert.ok(/Xeomin<\/b><em>1<\/em>/.test(sh),'ยอดรวมต้องแยกตาม product');
assert.ok(/Radiesse<\/b><em>0<\/em>/.test(sh),'product ที่ไม่ได้ขอ support ต้องเป็น 0 ไม่ใช่หายไป');
assert.ok(/รวมทั้งหมด<\/b><em>4<\/em>/.test(sh),'ยอดรวมต้องเป็นจำนวนคิวทั้งหมด');
assert.ok(!/เคส/.test(sh),'แผงนี้ต้องไม่โชว์จำนวนเคส กันสับสนว่าเป็นจำนวนคิว');
['คลินิกเอ','คลินิกบี','คลินิกซี'].forEach(c=>assert.ok(sh.includes(c),'ต้อง list คลินิก '+c));
assert.ok(!sh.includes('คลินิกดี'),'คิวที่ไม่ได้ขอ hands-on ต้องไม่เข้ารายการ');
assert.ok(sh.indexOf('คลินิกเอ')<sh.indexOf('คลินิกบี'),'เรียงตามจำนวนคิวมากไปน้อย');
assert.ok(sh.includes('คลินิกซี'),'คิวที่ขอ support แต่ไม่ได้กรอกจำนวนเคส ต้องยังนับเป็น 1 คิว');
assert.strictEqual((sh.match(/<th>/g)||[]).length,6,'ตารางต้องมี Clinic + 4 product + รวม');
assert.strictEqual(X.tpSupHTML([]).includes('ไม่มีการขอ Support Product'),true,'ไม่มีข้อมูลต้องบอกให้รู้');

/* 70. กดชื่อคลินิกใน Support Product แล้วต้องเห็นรายละเอียดเคสที่ Sale กรอกไว้ */
assert.ok(/data-supcl="คลินิกเอ"/.test(sh),'แถวคลินิกต้องกดได้');
X.tpSupHTML(SUP);   // เรนเดอร์ตารางรอบล่าสุดคือชุดที่หน้ารายละเอียดอ่าน
X.openSupClinic('คลินิกเอ');
const supSheet=sheet(),supHead=G('sheetHead').innerHTML;
assert.ok(supHead.includes('คลินิกเอ'),'หัวเรื่องต้องเป็นชื่อคลินิกที่กด');
assert.ok(/Ultherapy · 2 เคส/.test(supSheet)&&/Xeomin · 3 เคส/.test(supSheet),'ต้องสรุปเคสรายตระกูลของคลินิกนั้น');
assert.ok(/รวม 5 เคส · 2 คิว/.test(supSheet),'ต้องบอกยอดรวมของคลินิกนั้น');
assert.ok(supSheet.includes('1.5cc x2'),'ต้องเห็นข้อความรายละเอียดเคสที่ Sale พิมพ์ไว้');
assert.ok(supSheet.includes('TR-9100')&&supSheet.includes('POP'),'ต้องบอกว่าเป็นคิวไหน ใครเทรน');
assert.ok(!supSheet.includes('คลินิกบี'),'ต้องเห็นเฉพาะคลินิกที่กด');
X.openSupClinic('คลินิกดี');
assert.ok(!/คลินิกดี/.test(G('sheetHead').innerHTML),'คลินิกที่ไม่ได้ขอ hands-on กดแล้วต้องไม่เปิดอะไร');

/* เทสรอบใหม่ — ครอบด้วยบล็อกเดียว ชื่อตัวแปรจะได้ไม่ชนกับเทสข้างบน */
{
/* 71. คิวยกเลิกกระชั้น (<24 ชม.) ค้างในปฏิทินเป็น ✕ Cancel และไม่นับ KPI · เกิน 24 ชม. ลบทิ้ง */
clean();
const soonK=(()=>{const d=new Date(Date.now()+6*3600e3);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
const farK=FUT(5);
X.state.role='cts';X.state.me=B1;
const mkCancelReq=(id,date)=>({id,team:'A',status:'approved',mode:'std',module:'MAX-Entry',product:['Ultherapy'],
  topic:'t',clinic:'คลินิกยก',map:'',doctors:1,exp:'',handsOn:false,photos:[],requester:'a',requesterId:'C01',area:'Champion',
  sessions:[{date,slot:'am',ctsId:B1,start:'09:00',end:'12:00'}]});
X.state.requests=[mkCancelReq('TR-CX1',soonK)];
X.state.sched[soonK]={[B1]:{am:{kind:'booked',title:'คลินิกยก',product:['Ultherapy'],reqId:'TR-CX1',start:'09:00',end:'12:00'},pm:null}};
assert.strictEqual(X.lateSess(X.state.requests[0].sessions[0]),true,'คิววันนี้ = ยกเลิกกระชั้น');
X.cancelReq('TR-CX1');G('cxWhy').value='';G('cxYes').onclick();
assert.strictEqual(X.state.requests[0].status,'approved','ไม่กรอกเหตุผล ต้องยังยกเลิกไม่ได้');
G('cxWhy').value='คลินิกเลื่อนเอง';G('cxYes').onclick();
const cx=X.state.requests[0];
assert.strictEqual(cx.status,'cancelled','ยกเลิกแล้ว');
assert.strictEqual(cx.cancelReason,'คลินิกเลื่อนเอง','ต้องเก็บเหตุผล');
assert.strictEqual((cx.cancelKeep||[]).join(','),soonK,'วันกระชั้นต้องถูกคงไว้ในปฏิทิน');
assert.ok((cx.trail||[]).some(t=>t.act==='cancelled'&&t.note==='คลินิกเลื่อนเอง'),'เหตุผลต้องลง Approval Status Tracking');
const cxEnt=X.dayEntries(soonK).filter(e=>e.job&&e.job.reqId==='TR-CX1');
assert.strictEqual(cxEnt.length,1,'คิวกระชั้นต้องยังอยู่ในปฏิทิน');
assert.strictEqual(cxEnt[0].job.kind,'cxl','ต้องเป็นคิวยกเลิก');
assert.ok(X.tbcTag(cxEnt[0].job).includes('Cancel'),'ต้องมีป้าย ✕ Cancel');
assert.strictEqual(X.slotStatus(soonK,B1,'am'),'free','ช่องเวลาต้องคืนให้จองใหม่ได้');
assert.strictEqual(X.tpAllRows().filter(r=>r.reqId==='TR-CX1').length,0,'คิวที่ยกเลิกต้องไม่นับ KPI');
assert.ok(X.recTableRows([cx])[0].includes('คลินิกเลื่อนเอง'),'เหตุผลต้องอยู่ในตาราง Excel ของ Record');
assert.strictEqual(X.REC_COLS.length,X.recTableRows([cx])[0].length,'จำนวนคอลัมน์กับข้อมูลต้องเท่ากัน');
/* เกิน 24 ชม. -> ลบออกจากปฏิทินตามเดิม */
clean();X.state.requests=[mkCancelReq('TR-CX2',farK)];
X.cancelReq('TR-CX2');G('cxWhy').value='ลูกค้ายกเลิก';G('cxYes').onclick();
assert.strictEqual((X.state.requests[0].cancelKeep||[]).length,0,'ยกเลิกล่วงหน้าเกิน 24 ชม. ต้องไม่ค้างในปฏิทิน');
assert.strictEqual(X.dayEntries(farK).filter(e=>e.job&&e.job.reqId==='TR-CX2').length,0,'ต้องหายจากปฏิทิน');

/* 72. ปฏิทินรายวัน: เวลาขยายถึงคิวกลางคืน · กล่องโชว์เวลาเริ่มอย่างเดียว · ยืดเต็มพื้นที่ว่าง */
clean();
addSelf({start:'21:00',end:'23:30',title:'คิวดึก'});
const tl=X.timelineHTML(K);
assert.ok(tl.includes('23:00'),'แถบเวลาต้องครอบคลุมคิวกลางคืน');
assert.ok(tl.includes('<b>21:00</b>'),'กล่องต้องโชว์เวลาเริ่ม');
assert.ok(!tl.includes('21:00–23:30'),'กล่องต้องไม่โชว์ช่วงเวลายาว');
const lay=X.layoutEntries([{start:'09:00',end:'10:00'},{start:'09:30',end:'11:00'},{start:'13:00',end:'14:00'}]);
assert.strictEqual(lay.n,2,'สองคิวทับกัน = 2 คอลัมน์');
assert.strictEqual(lay.items[2].span,2,'คิวบ่ายไม่ทับใคร ต้องยืดเต็ม 2 คอลัมน์');
assert.strictEqual(lay.items[0].span,1,'คิวที่ทับกันต้องไม่ยืดทับกล่องอื่น');

/* 73. คิวที่ CTS ลงเอง + เลือก PS Area ต้องโผล่ในปฏิทินของ Sale รหัสนั้น (อ่านอย่างเดียว) */
clean();
X.state.role='cts';X.state.me=B1;
X.state.selfEvents=[{id:'SE-PS',date:K,dateEnd:'',allDay:false,start:'09:00',end:'12:00',
  title:'Ultherapy @ คลินิกพีเอส',detail:'',product:['Ultherapy'],topics:[],attendees:[B1],owner:B1,
  psArea:'C01',clinic:'คลินิกพีเอส',clinicType:'Single',doctors:'2',module:'MAX-Entry',ptopic:{}}];
X.state.role='sales';X.state.area='Champion';X.state.salesId='C01';
const se1=X.smEntries(K);
assert.strictEqual(se1.length,1,'Sale C01 ต้องเห็นคิวนี้ในปฏิทินตัวเอง');
assert.ok(X.smChip(se1[0],true).includes('คลินิกพีเอส'),'ต้องโชว์ชื่อคลินิก');
assert.ok(X.smChip(se1[0],true).includes(X.CTS.find(c=>c.id===B1).nick),'ต้องบอกว่า CTS คนไหนไป');
assert.ok(!X.smChip(se1[0],true).includes('data-smreq'),'คิวที่ CTS ลงเอง ต้องกดเปิดคำขอไม่ได้');
X.state.salesId='C02';
assert.strictEqual(X.smEntries(K).length,0,'Sale รหัสอื่นต้องไม่เห็น');
X.state.selfEvents[0].psArea='';X.state.salesId='C01';
assert.strictEqual(X.smEntries(K).length,0,'ไม่เลือก PS Area ต้องไม่ลงปฏิทิน Sale');

/* 74. คิว approved ในปฏิทิน Sale/SM ต้องบอกชื่อ CTS ที่ไปเทรน */
clean();
X.state.role='sales';X.state.area='Champion';X.state.salesId='C01';
X.state.requests=[mkCancelReq('TR-W1',K)];
const wchip=X.smEntries(K)[0];
assert.ok(X.smChip(wchip,false).includes('CTS '+X.CTS.find(c=>c.id===B1).nick),'คิว approved ต้องโชว์ชื่อ CTS');
X.state.requests[0].status='pending';
assert.ok(!X.smChip(X.smEntries(K)[0],false).includes('CTS '),'ยังไม่อนุมัติ ต้องยังไม่โชว์ชื่อ');

/* 75. ค้นหาคิวงานในปฏิทิน */
clean();
X.state.role='cts';X.state.me=ME;
addSelf({start:'09:00',end:'10:00',title:'Ultherapy office'});
addSelf({start:'13:00',end:'14:00',title:'ประชุมทีม'});
assert.strictEqual(X.entriesOf(K,ME).length,2,'ยังไม่ค้น ต้องเห็นทั้งสองคิว');
X.state.q='ultherapy';
assert.strictEqual(X.monthHTML().includes('ประชุมทีม'),false,'คิวที่ไม่ตรงคำค้นต้องถูกซ่อน');
assert.strictEqual(X.monthHTML().includes('Ultherapy office'),true,'คิวที่ตรงคำค้นต้องยังอยู่');
X.state.q='';

/* 76. ทริป UPC: เปลี่ยนผู้เทรนแยกรายคลินิกในวันเดียวกัน */
clean();
const U1=X.BOOKABLE_CTS()[0].id,U2=X.BOOKABLE_CTS()[1].id;
X.state.role='cts';X.state.me=U1;
X.state.requests=[{id:'TR-U1',team:'BOTH',area:'UPC',mode:'upc',status:'approved',module:'UPC Trip',
  product:['Ultherapy'],topic:'',clinic:'',map:'',doctors:'',exp:'',handsOn:false,photos:[],
  requester:'u',requesterId:'UPC1',dateFrom:K,dateTo:K,
  days:[{date:K,items:[{clinic:'คลินิกหนึ่ง',province:'กทม',map:'m',start:'09:00',end:'12:00',product:'Ultherapy',doctors:'2',topic:'a'},
                       {clinic:'คลินิกสอง',province:'กทม',map:'m',start:'13:00',end:'16:00',product:'Xeomin',doctors:'1',topic:'b'}]}],
  sessions:[{date:K,slot:'day',ctsId:U1,fullDay:true}]}];
const ur=X.state.requests[0];
X.bookUPC(ur);
assert.strictEqual(X.dayEntries(K).filter(e=>e.job&&e.job.reqId==='TR-U1').length,1,'ยังไม่แยก = คิวเดียวทั้งวัน');
assert.strictEqual(X.tpAllRows().filter(r=>r.reqId==='TR-U1').length,2,'นับ 2 คลินิก');
/* แยกคลินิกที่ 2 ให้อีกคน */
X.openReqSession('TR-U1',0);
assert.ok(/data-rsit="1"/.test(sheet()),'ต้องมีช่องเลือกผู้เทรนรายคลินิก');
X.openReqSession('TR-U1',0,{title:'',start:'09:00',end:'16:00',extra:[],main:U1,its:['',U2]});
/* mock element ถูก cache ไว้ทั้งไฟล์ — ล้าง rsMain ที่เทสก่อนหน้าตั้งค้างไว้ (ของจริงไม่มีช่องนี้เมื่อไม่ใช่หัวหน้า) */
G('rsMain').value='';
G('rsTitle').value='';G('rsStart').value='09:00';G('rsEnd').value='16:00';
G('rsSave').onclick();
assert.strictEqual(ur.days[0].items[1].ctsId,U2,'คลินิกที่ 2 ต้องเปลี่ยนผู้เทรนได้');
assert.strictEqual(ur.days[0].items[0].ctsId,undefined,'คลินิกที่ 1 ต้องยังใช้ผู้เทรนหลัก');
/* array ที่สร้างในบริบท vm คนละ prototype กับของไฟล์เทส — เทียบเป็นสตริงแทน */
assert.strictEqual(X.upcDayWho(ur,ur.sessions[0]).slice().sort().join(','),[U1,U2].sort().join(','),'ต้องตัดคิวว่างของทั้งสองคน');
const ue=X.dayEntries(K).filter(e=>e.job&&e.job.reqId==='TR-U1');
assert.strictEqual(ue.length,2,'แยกผู้เทรนแล้วต้องเป็น 2 กล่องในปฏิทิน');
assert.ok(ue.some(e=>e.who[0]===U2&&e.job.title==='คลินิกสอง'),'กล่องของคนที่ 2 ต้องเป็นคลินิกสอง');
assert.strictEqual(X.slotStatus(K,U2,'pm'),'booked','คนที่รับคลินิกที่ 2 ต้องถูกตัดคิวว่าง');
assert.strictEqual(X.tpAllRows().filter(r=>r.reqId==='TR-U1').length,2,'KPI ต้องยังนับ 2 คลินิก ไม่นับซ้ำ');
assert.ok((ur.trail||[]).some(t=>t.act==='changed-trainer'),'ต้องบันทึกการเปลี่ยนตัวใน trail');

/* 77. ตัวเลือกใหม่ที่ขอเพิ่ม + กติกาคิวว่างที่ผ่อนให้ */
assert.ok(X.TOPIC_TAGS.includes('Coaching'),'ต้องมีประเภทคิว Coaching');
assert.ok(X.topicsOf('Ultherapy').includes('Ultherapy MAX'),'ต้องมีหัวข้อ Ultherapy MAX');
assert.strictEqual(X.topicsOf('Radiesse Hybrid').join(','),'RR Mix,RV Mix','Radiesse Hybrid ต้องมีหัวข้อของตัวเอง');
assert.ok(X.PRODHEX['Radiesse Hybrid'],'Radiesse Hybrid ต้องมีสีตามตระกูล Radiesse');
clean();
X.state.role='cts';X.state.me=X.LEAD_IDS[0];
X.LEAD_IDS.forEach(id=>X.PRODUCTS.forEach(p=>X.setSkill(id,p,'self')));
X.BOOKABLE_CTS().forEach(c=>X.setSkill(c.id,'Ultherapy','self'));
X.state.upcProd=['Ultherapy'];
assert.ok(X.upcAble().some(c=>X.LEAD_IDS.includes(c.id)),'UPC ต้องเลือก PAM/MILK ได้');
assert.ok(X.upcFree(FUT(20),X.LEAD_IDS[0]),'ต้องเห็นวันว่างของ PAM/MILK ในปฏิทิน UPC');
assert.strictEqual(X.freeIds(FUT(20),'am',['Ultherapy']).some(id=>X.LEAD_IDS.includes(id)),false,
  'คิวว่างฝั่ง Sale ปกติต้องไม่นับ PAM/MILK');
const sat=(()=>{const d=new Date();d.setDate(d.getDate()+20);while(d.getDay()!==6)d.setDate(d.getDate()+1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
assert.strictEqual(X.upcFree(sat,X.LEAD_IDS[0]),'special','เสาร์–อาทิตย์ของ UPC ต้องเป็นคิวพิเศษ ไม่ใช่คิวว่าง');
const near=(()=>{const d=new Date();d.setDate(d.getDate()+2);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
assert.strictEqual(X.isUrgent(near),true,'วันในระยะ 5 วันต้องนับเป็นคิวด่วน (ไม่โชว์คิวว่าง)');
assert.strictEqual(X.isUrgent(FUT(0)),false,'วันไกลๆ ต้องไม่ใช่คิวด่วน');

}
console.log('✓ ผ่านทั้ง 77 ข้อ');

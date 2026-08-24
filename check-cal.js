/* เทสปฏิทินตามเวลาจริง — รัน: node check-cal.js
   ครอบบั๊กที่แก้: คิวขึ้นซ้ำ 2 อัน · คิวที่ 3 ของวันหาย · คิวว่างฝั่ง Sales ไม่บวกเวลาเดินทาง 2 ชม. */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const L=html.split('\n');
const a=L.findIndex(l=>l.trim()==='<script>'), b=L.findIndex(l=>l.trim()==='</script>');
let src=L.slice(a+1,b).join('\n').replace(/^restoreLogin\(\);.*$/m,'');

const el=()=>({innerHTML:'',classList:{add(){},remove(){}},style:{},querySelectorAll:()=>[],
  addEventListener(){},appendChild(){},focus(){},scrollTop:0,dataset:{},textContent:'',value:''});
const store={};
const cache={};const G=id=>cache[id]||(cache[id]=el());   // คืน element เดิมทุกครั้ง จะได้อ่าน innerHTML กลับมาตรวจได้
const sheet=()=>G('sheetBody').innerHTML;
const ctx={console,setTimeout,clearTimeout,Date,Math,JSON,Object,Array,String,Number,Set,Map,Promise,
  URL:{createObjectURL:()=>''},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  window:{innerWidth:1200,addEventListener(){}},
  document:{getElementById:G,querySelectorAll:()=>[],createElement:el,body:el(),addEventListener(){},execCommand(){}},
  navigator:{clipboard:{writeText:()=>Promise.resolve()}},
  fetch:()=>Promise.resolve({json:()=>Promise.resolve({ok:true,version:1,data:{}})})};
ctx.globalThis=ctx;
vm.createContext(ctx);
src += '\n__x={state,dayEntries,entriesOf,autoWindow,slotTime,slotStatus,slotWindow,syncSelf,CTS,SLOT_DEF,AUTO_RULE,'
     + 'renderCal,monthHTML,weekHTML,openDay,openSelfEntry,openEventForm,openJob,reqCard,dayAnon,dayNamed,maCard};';
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

console.log('✓ ผ่านทั้ง 10 ข้อ');

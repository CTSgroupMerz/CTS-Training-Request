/* เทสการซิงก์กับเซิร์ฟเวอร์ — รัน: node check-sync.js
   บั๊กที่คุม: "กดอนุมัติ / ลบคิว / ส่งคำขอ แล้วเด้งกลับเป็นแบบเดิม ทั้งที่บันทึกไปแล้ว"
   = load() ที่ยิงไปก่อนหน้าการแก้ กลับมาทีหลังแล้วเอา state เก่าจากเซิร์ฟเวอร์ทับของในเครื่อง */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const L=html.split('\n');
const a=L.findIndex(l=>l.trim()==='<script>'), b=L.findIndex(l=>l.trim()==='</script>');
let src=L.slice(a+1,b).join('\n').replace(/^restoreLogin\(\);.*$/m,'');

const el=()=>({innerHTML:'',classList:{add(){},remove(){},contains(){return false}},style:{},querySelectorAll:()=>[],
  addEventListener(){},appendChild(){},focus(){},scrollIntoView(){},scrollTop:0,dataset:{},textContent:'',value:''});
const cache={};const G=id=>cache[id]||(cache[id]=el());

/* ---- Supabase ปลอม: แค่พอให้ load()/save() เดินครบทาง ---- */
const DB={requests:[],profiles:[],jobs:[],skills:[],
  holidays:[{date:'2026-01-01',name:'ปีใหม่'}],events:[],avail:[]};
const writes=[];
let netDelay=0;                       // หน่วงเน็ต (ms) — ใช้จำลองช่วง "กำลังโหลดอยู่"
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const mkQ=rows=>{
  const o={};
  ['select','order','range','eq','in','single','limit','gte','lte'].forEach(m=>o[m]=()=>o);
  o.maybeSingle=()=>{o._one=true;return o;};
  o.then=(res,rej)=>wait(netDelay).then(()=>({data:o._one?(rows[0]||null):rows,error:null})).then(res,rej);
  return o;
};
let failTable=null,failCode=null,claimTaken=false;   // จำลองตารางที่เขียนไม่ได้ (ยังไม่ได้สร้าง / RLS ปิด / FK พัง)
const mkErr=code=>{const o=mkQ([]);o.then=(res,rej)=>wait(netDelay)
  .then(()=>({data:null,error:{code,message:'boom '+code}})).then(res,rej);return o;};
const fakeSB={from(t){
  const o=mkQ(DB[t]||[]);
  ['upsert','insert','delete','update'].forEach(m=>o[m]=(v,opt)=>{writes.push([t,m,v]);
    if(t==='jobs'&&opt&&opt.ignoreDuplicates)return mkQ(claimTaken?[]:[{id:7}]);   // ON CONFLICT DO NOTHING: ช่องถูกยึดแล้ว = ไม่คืนแถว
    return failTable===t?mkErr(failCode):mkQ([{id:1}]);});
  return o;}};
let refreshed=0;
fakeSB.auth={refreshSession:()=>{refreshed++;return Promise.resolve({data:{session:{}},error:null});}};

const ctx={console,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},Date,Math,JSON,Object,Array,String,Number,Set,Map,Promise,
  URL:{createObjectURL:()=>''},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  window:{innerWidth:1200,addEventListener(){},supabase:{createClient:()=>fakeSB}},
  document:{getElementById:G,querySelectorAll:()=>[],createElement:el,body:el(),addEventListener(){},
    visibilityState:'visible',execCommand(){}},
  navigator:{clipboard:{writeText:()=>Promise.resolve()},setAppBadge(){},clearAppBadge(){}},
  fetch:()=>Promise.resolve({json:()=>Promise.resolve({})})};
ctx.globalThis=ctx;
vm.createContext(ctx);
src+='\n__x={state,load,save,snap,dirty,render,CTS,newId,setRole:r=>{auth={role:r};},setJob,jobOf,commitReq,claimOr,selfCheck};';
new vm.Script(src).runInContext(ctx);
const X=ctx.__x;
X.state.role='cts';X.state.me=X.CTS[0].id;X.state.authed=true;X.state.tab='cal';

const mkReq=id=>({id,mode:'normal',status:'pending',team:'A',area:'C01',product:'Ultherapy',
  clinic:'คลินิก '+id,module:'MAX-Entry',level:'Standard',topic:'t',map:'m',doctors:2,exp:'x',
  requester:'ก',sessions:[],photos:[],ack:{},trail:[],created:new Date()});

(async()=>{
  /* 1. โหลดครั้งแรกต้องสำเร็จ และ state ต้องถือว่า "ตรงกับเซิร์ฟเวอร์" */
  assert.strictEqual(await X.load(),true,'โหลดครั้งแรกต้องสำเร็จ');
  assert.strictEqual(X.dirty(),false,'โหลดเสร็จใหม่ๆ ต้องไม่มีของค้าง');

  /* 2. หัวใจของบั๊ก — ระหว่าง load() ค้างอยู่ ผู้ใช้กดอนุมัติ/ลบ/ส่งคำขอ
        ข้อมูลที่กำลังยิงกลับมาถูกอ่านมาก่อนการแก้ = เก่ากว่า ห้ามเอามาทับ */
  netDelay=40;
  const p=X.load();
  await wait(5);                       // ให้ load() ยิงคำขอออกไปก่อน
  X.state.requests.push(mkReq('TR-RACE'));
  assert.strictEqual(await p,false,'load ที่ยิงไปก่อนการแก้ ต้องถูกทิ้ง ไม่เอามาทับ');
  assert.ok(X.state.requests.some(r=>r.id==='TR-RACE'),
    'ของที่เพิ่งกดต้องไม่หาย (อาการ "เด้งกลับแบบเดิม ทั้งที่บันทึกไปแล้ว")');

  /* 3. ของที่ค้างต้องถูกส่งขึ้นเซิร์ฟเวอร์เอง ไม่ต้องให้คนกดซ้ำ */
  await wait(150);
  assert.ok(writes.some(w=>w[0]==='requests'&&w[1]==='upsert'),'คำขอที่เพิ่งเพิ่มต้องถูกส่งขึ้นเซิร์ฟเวอร์');
  assert.strictEqual(X.dirty(),false,'บันทึกสำเร็จแล้วต้องไม่เหลือของค้าง');

  /* 4. โหลดซ้ำตอนไม่มีของค้าง ต้องทำงานปกติ (ไม่ใช่ block ทิ้งทุกรอบ) */
  netDelay=0;
  assert.strictEqual(await X.load(),true,'ไม่มีของค้าง ต้องโหลดทับได้ตามปกติ');

  /* 5. load() ซ้อนกันเองต้องไม่ยิงพร้อมกัน */
  netDelay=30;
  const [r1,r2]=await Promise.all([X.load(),X.load()]);
  assert.ok(r1===false||r2===false,'load() ที่ซ้อนเข้ามาระหว่างรอบเดิม ต้องถูกกันไว้');

  /* 6. ป้ายสถานะต้องบอกผลจริง ไม่ให้คนกดเดาเอง */
  netDelay=0;
  X.state.requests.push(mkReq('TR-CHIP'));
  await X.save();
  assert.ok(/บันทึก/.test(G('syncchip').textContent),'หลังบันทึกต้องมีป้ายบอกสถานะ');


  /* 7. ตารางที่ยังตั้งค่าใน Supabase ไม่ครบ (เช่น avail ยังไม่ได้สร้าง)
        ต้องเตือนแล้วข้ามไป ไม่ใช่ทำให้ทั้งรอบค้างที่ "ยังไม่ได้บันทึก" ทั้งที่คำขอขึ้นไปแล้ว */
  failTable='avail';failCode='42P01';
  X.state.requests.push(mkReq('TR-PART'));
  X.state.avail={'2027-01-05':{[X.CTS[1].id]:{am:{start:'10:00',end:'12:00'}}}};
  await X.save();
  assert.ok(writes.some(w=>w[0]==='requests'&&JSON.stringify(w[2]).includes('TR-PART')),
    'คำขอต้องขึ้นเซิร์ฟเวอร์ถึงแม้ตารางอื่นจะยังตั้งค่าไม่ครบ');
  assert.strictEqual(X.dirty(),false,'ส่วนที่ตั้งค่าไม่ครบ ต้องไม่ทำให้ทั้งรอบบันทึกค้าง');
  assert.ok(!/ยังไม่ได้บันทึก/.test(G('syncchip').textContent),'ป้ายต้องไม่เตือนผิดว่ายังไม่ได้บันทึก');

  /* 8. error จริง (ไม่ใช่เรื่องตั้งค่า) ต้องยังเตือนและถือว่าของค้างอยู่ */
  failTable='requests';failCode='23503';
  X.state.requests.push(mkReq('TR-FK'));
  await X.save();
  assert.ok(/ยังไม่ได้บันทึก/.test(G('syncchip').textContent),'error จริงต้องยังเตือน');
  assert.ok(/23503/.test(G('syncchip').textContent),'ป้ายต้องบอกรหัส error จะได้ไล่ต่อได้');
  assert.strictEqual(X.dirty(),true,'ของที่ยังไม่ขึ้นเซิร์ฟเวอร์ ต้องถือว่าค้างอยู่');
  failTable=null;

  /* 9. CTS ล็อกอินอยู่แต่ token หมดอายุ -> คำขอไปแบบ anon -> events ตอบ 42501
        ต้องไม่ข้ามส่วน events ถาวร (อาการ "ลงงานแล้วไม่ขึ้น ต้องออกแล้วเข้าใหม่") */
  await X.save();                      // เคลียร์ TR-FK ที่ค้างจากข้อ 8 ก่อน
  X.setRole('cts');
  failTable='events';failCode='42501';
  X.state.selfEvents.push({id:'SE-900AB',date:'2027-01-06',attendees:[X.CTS[0].id],title:'ลงงานตอน token หมด'});
  await X.save();
  assert.strictEqual(X.dirty(),true,'token หมดอายุ ห้ามถือว่าคิวที่ลงเองบันทึกแล้ว');
  assert.ok(refreshed>0,'ต้องต่ออายุ session ก่อนลองใหม่');
  failTable=null;
  await X.save();
  assert.ok(writes.some(w=>w[0]==='events'&&JSON.stringify(w[2]).includes('SE-900AB')&&w[1]==='upsert'),
    'ต่ออายุแล้วรอบถัดไปต้องบันทึกคิวขึ้นได้ ไม่ต้องออกแล้วเข้าใหม่');
  assert.strictEqual(X.dirty(),false,'บันทึกแล้วต้องไม่เหลือของค้าง');

  /* 10. กดส่งพร้อมกัน 2 เครื่อง — อีกเครื่องยึดช่องบนเซิร์ฟเวอร์ไปก่อน (ข้อมูลในเครื่องยังไม่รู้)
        คำขอนี้ต้องไม่ถูกยืนยัน และไม่มีคิวค้างในเครื่อง · ช่องว่างจริงต้องส่งผ่าน */
  {const D2='2026-12-01',C=X.CTS[1].id,rq=mkReq('TR-CLAIM');rq.sessions=[{date:D2,slot:'am',ctsId:C}];
  claimTaken=true;DB.jobs=[{id:99,date:D2,cts_id:C,slot:'am',req_id:'TR-OTHER',kind:'pend'}];
  const other={id:'TR-OTHER',mode:'normal',status:'sm',team:'A',area:'C01',products:['Ultherapy'],client:{status:'sm',sessions:[]}};
  DB.requests=[other];   /* คำขอของอีกเครื่องมีอยู่จริงบนเซิร์ฟเวอร์ */
  let done=false;
  X.setJob(D2,C,'am',{kind:'pend',reqId:'TR-CLAIM'});
  X.commitReq(rq,'btnSend',()=>{done=true;});
  assert.ok(!X.jobOf(D2,C,'am'),'ระหว่างรอผล ต้องไม่มีคิวในเครื่อง (กัน autosave เขียนทับช่องคนอื่น)');
  await wait(200);
  assert.ok(!done,'ช่องถูกเครื่องอื่นยึดแล้ว ต้องไม่ยืนยันคำขอ');
  assert.notStrictEqual((X.jobOf(D2,C,'am')||{}).reqId,'TR-CLAIM','ต้องไม่มีคิวของคำขอที่ส่งไม่ผ่านค้างอยู่');
  claimTaken=false;DB.jobs=[];DB.requests=[];await wait(200);
  X.setJob(D2,C,'am',{kind:'pend',reqId:'TR-CLAIM'});
  X.commitReq(rq,'btnSend',()=>{done=true;});
  await wait(200);
  assert.ok(done,'ช่องว่างจริง ต้องส่งผ่าน');
  assert.strictEqual((X.jobOf(D2,C,'am')||{}).reqId,'TR-CLAIM','ส่งผ่านแล้วคิวต้องกลับมาอยู่ในเครื่อง');}

  /* 11. ช่องที่ค้างเป็นคิวกำพร้า (คำขอถูกลบไปแล้ว — เคส TR-1086US 15 ต.ค.) ต้องรับคิวใหม่ได้ */
  {const D3='2026-12-02',C=X.CTS[1].id,rq=mkReq('TR-NEW');rq.sessions=[{date:D3,slot:'am',ctsId:C}];
  claimTaken=true;DB.requests=[];DB.jobs=[{id:98,date:D3,cts_id:C,slot:'am',req_id:'TR-GONE',kind:'pend'}];
  let done=false;writes.length=0;
  X.setJob(D3,C,'am',{kind:'pend',reqId:'TR-NEW'});
  X.commitReq(rq,'btnSend',()=>{done=true;});
  await wait(200);
  assert.ok(done,'คิวกำพร้าต้องไม่กันช่อง — รับคิวใหม่ได้');
  assert.ok(writes.some(w=>w[0]==='jobs'&&w[1]==='update'&&w[2].req_id==='TR-NEW'),'ต้องยึดแถวกำพร้าแทน');
  claimTaken=false;DB.jobs=[];}

  /* 12. Sale ยึดช่องได้ แต่ CTS เพิ่งลงคิวเองช่วงนั้นบนเซิร์ฟเวอร์ (เครื่องนี้ยังไม่รู้) -> ต้องปล่อยช่องคืน ไม่ยืนยัน */
  {const D4='2026-12-03',C=X.CTS[1].id,rq=mkReq('TR-SE');rq.sessions=[{date:D4,slot:'am',ctsId:C}];
  DB.jobs=[];DB.requests=[];DB.events=[{id:5000001,date:D4,slot:'all',cts:[C],title:'ลา',detail:null,product:null,topics:[],
    client:{id:'SE-9001XX',src:'SE',date:D4,dateEnd:'',allDay:false,start:'09:00',end:'12:00',attendees:[C],title:'ลา',owner:C}}];
  let done=false;writes.length=0;
  X.setJob(D4,C,'am',{kind:'pend',reqId:'TR-SE'});
  X.commitReq(rq,'btnSend',()=>{done=true;});
  await wait(200);
  assert.ok(!done,'มีคิวที่ CTS ลงเองทับอยู่บนเซิร์ฟเวอร์ ต้องไม่ยืนยันคำขอ');
  assert.ok(writes.some(w=>w[0]==='jobs'&&w[1]==='delete'),'ต้องคืนช่องที่ยึดไว้');
  DB.events=[];await wait(200);}

  /* 13. แก้คำขอเดิม: ช่องที่เป็นของคำขอนี้อยู่แล้วบนเซิร์ฟเวอร์ ต้องผ่าน (ไม่ถือว่าชน) · ช่องของคำขออื่นต้องไม่ผ่าน */
  {const D5='2026-12-04',C=X.CTS[1].id;
  claimTaken=true;DB.requests=[{id:'TR-MINE',mode:'normal',status:'sm',team:'A',area:'C01',products:['Ultherapy'],client:{status:'sm',sessions:[]}}];   /* คำขอตัวเองยังมีผลบนเซิร์ฟเวอร์ */
  DB.jobs=[{id:97,date:D5,cts_id:C,slot:'am',req_id:'TR-MINE',kind:'tbc'}];
  let done=false;
  X.claimOr('TR-MINE',[{k:D5,cid:C,sl:'am',j:{kind:'pend',reqId:'TR-MINE'}}],'x',()=>{done=true;});
  await wait(200);
  assert.ok(done,'ช่องของคำขอตัวเองต้องผ่าน (แปลง TBC / แก้คำขอ)');
  DB.requests=[{id:'TR-OTHER',mode:'normal',status:'approved',team:'A',area:'C01',products:['Ultherapy'],client:{status:'approved',sessions:[]}}];
  DB.jobs=[{id:96,date:D5,cts_id:C,slot:'pm',req_id:'TR-OTHER',kind:'booked'}];done=false;
  X.claimOr('TR-MINE',[{k:D5,cid:C,sl:'pm',j:{kind:'pend',reqId:'TR-MINE'}}],'x',()=>{done=true;});
  await wait(200);
  assert.ok(!done,'ย้ายวัน/เปลี่ยนคนไปทับช่องของคำขออื่น ต้องไม่ผ่าน');
  claimTaken=false;DB.jobs=[];DB.requests=[];await wait(200);}

  /* 14. CTS ลงคิวเอง: มีคำขอใหม่ของ Sale (เครื่องนี้ยังไม่รู้) อยู่ในช่องนั้นบนเซิร์ฟเวอร์ -> ต้องหยุดให้ดูก่อน */
  {const D6='2026-12-07',C=X.CTS[1].id;
  DB.requests=[{id:'TR-FRESH',mode:'normal',status:'sm',team:'A',area:'C01',products:['Ultherapy'],client:{status:'sm',sessions:[]}}];
  DB.jobs=[{id:95,date:D6,cts_id:C,slot:'am',req_id:'TR-FRESH',kind:'pend'}];
  X.state.requests=X.state.requests.filter(r=>r.id!=='TR-FRESH');
  let done=false;
  X.selfCheck([{k:D6,cid:C,sl:'am'}],'x',()=>{done=true;});
  await wait(200);
  assert.ok(!done,'มีคำขอใหม่ของ Sale ในช่องนั้น ต้องไม่บันทึกคิวที่ลงเองทันที');
  DB.jobs=[];done=false;
  X.selfCheck([{k:D6,cid:C,sl:'am'}],'x',()=>{done=true;});
  await wait(200);
  assert.ok(done,'ไม่มีคำขอใหม่ ต้องบันทึกได้');
  DB.requests=[];await wait(200);}

  console.log('check-sync: ผ่านหมด');
  process.exit(0);   // แอปตั้ง setInterval ไว้ ถ้าไม่ exit เทสจะค้าง
})().catch(e=>{console.error(e);process.exit(1);});

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
  ['select','order','range','eq','in','single','limit'].forEach(m=>o[m]=()=>o);
  o.then=(res,rej)=>wait(netDelay).then(()=>({data:rows,error:null})).then(res,rej);
  return o;
};
let failTable=null,failCode=null;   // จำลองตารางที่เขียนไม่ได้ (ยังไม่ได้สร้าง / RLS ปิด / FK พัง)
const mkErr=code=>{const o=mkQ([]);o.then=(res,rej)=>wait(netDelay)
  .then(()=>({data:null,error:{code,message:'boom '+code}})).then(res,rej);return o;};
const fakeSB={from(t){
  const o=mkQ(DB[t]||[]);
  ['upsert','insert','delete','update'].forEach(m=>o[m]=v=>{writes.push([t,m,v]);
    return failTable===t?mkErr(failCode):mkQ([{id:1}]);});
  return o;}};

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
src+='\n__x={state,load,save,snap,dirty,render,CTS,newId};';
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

  console.log('check-sync: ผ่านหมด');
  process.exit(0);   // แอปตั้ง setInterval ไว้ ถ้าไม่ exit เทสจะค้าง
})().catch(e=>{console.error(e);process.exit(1);});

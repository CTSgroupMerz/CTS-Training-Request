/* เช็คของรอบนี้ — ป้ายสถานะ + ✓ KPI หลายคน
   รัน: node check-kpi.js   (ออฟไลน์ ไม่ยิงเน็ต ไม่แก้ไฟล์) */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const L=fs.readFileSync('index.html','utf8').split('\n');
const a=L.findIndex(l=>l.trim()==='<script>'),b=L.findIndex(l=>l.trim()==='</script>');
const src=L.slice(a+1,b).join('\n').replace(/^restoreLogin\(\);.*$/m,'');
const el=()=>new Proxy({},{get:(t,k)=>k==="querySelectorAll"||k==="querySelector"?()=>[]:k==="classList"?{add(){},remove(){},toggle(){}}:k==="style"?{}:undefined,set:()=>true});
const ctx={console,document:{getElementById:el,querySelectorAll:()=>[],querySelector:el,createElement:el,body:el(),addEventListener(){}},
  window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}})},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  navigator:{},location:{href:''},setTimeout,clearTimeout,setInterval,clearInterval,fetch:()=>{throw new Error('no net');}};
ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(src,ctx);
const J=JSON.stringify;const {stLabel,kpiList,ownersOf}=vm.runInContext('({stLabel,kpiList,ownersOf})',ctx);

/* 1. ป้ายสถานะอ่านออกทุกขั้น — ไม่มีคีย์ดิบหลุดออกจอ */
assert.strictEqual(stLabel('mgr'),'รอ CTM Approve');
assert.strictEqual(stLabel('approved'),'Approved');
assert.strictEqual(stLabel('sm'),'รอ SM Approve');

/* 2. ข้อมูลเก่าเก็บ kpi เป็นสตริงคนเดียว ต้องอ่านเป็น array ได้ */
assert.strictEqual(JSON.stringify(kpiList(null)),JSON.stringify([]));
assert.strictEqual(JSON.stringify(kpiList('pam')),JSON.stringify(['pam']));
assert.strictEqual(JSON.stringify(kpiList(['pam','june'])),JSON.stringify(['pam','june']));

/* 3. ✓ หลายคน = นับ KPI ให้ทุกคนที่ติ๊ก · ไม่ติ๊กเลย = ตกที่เจ้าของคิวเหมือนเดิม */
const E=(kpi,owner,who)=>({job:{kpi,owner},who});
assert.strictEqual(JSON.stringify(ownersOf(E(['pam','june'],'pam',['pam','june','pop']))),JSON.stringify(['pam','june']));
assert.strictEqual(JSON.stringify(ownersOf(E('june','pam',['pam','june']))),JSON.stringify(['june']));
assert.strictEqual(JSON.stringify(ownersOf(E(null,'pam',['pam','june']))),JSON.stringify(['pam']));
assert.strictEqual(JSON.stringify(ownersOf(E(null,null,['june','pam']))),JSON.stringify(['june']));
/* คนที่ถูกติ๊กแล้วถูกถอดออกจากงาน ต้องไม่ค้างเป็นเจ้าของ KPI */
assert.strictEqual(JSON.stringify(ownersOf(E(['pop'],'pam',['pam','june']))),JSON.stringify(['pam']));

console.log('check-kpi: ผ่านหมด');
process.exit(0);   /* แอปตั้ง interval ไว้ — ไม่ปิดเองแล้วโปรเซสค้าง */

/* smoke test — รัน: node check.js
   ครอบ: ข้อมูล demo หายจริง · state round-trip ผ่าน JSON ได้ · save() ไม่ทำข้อมูลหาย · รหัสผ่านไม่รั่วออกไฟล์ */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const L=html.split('\n');
const a=L.findIndex(l=>l.trim()==='<script>'), b=L.findIndex(l=>l.trim()==='</script>');
let src=L.slice(a+1,b).join('\n');
src=src.replace(/^restoreLogin\(\);.*$/m,'');          // ไม่ bootstrap ตอนเทส

let posts=[];
const store={};
const el=()=>({innerHTML:'',classList:{add(){},remove(){}},style:{},querySelectorAll:()=>[],
  addEventListener(){},appendChild(){},focus(){},scrollTop:0,dataset:{},textContent:'',value:''});
const ctx={console,setTimeout,clearTimeout,Date,Math,JSON,Object,Array,String,Number,Set,Map,Promise,
  URL:{createObjectURL:()=>''},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  window:{innerWidth:1200,addEventListener(){}},
  document:{getElementById:el,querySelectorAll:()=>[],createElement:el,body:el(),addEventListener(){},execCommand(){}},
  navigator:{clipboard:{writeText:()=>Promise.resolve()}},
  fetch:(u,o)=>{posts.push(JSON.parse(o.body));return Promise.resolve({json:()=>Promise.resolve({ok:true,version:9,data:{}})});}};
ctx.globalThis=ctx;
vm.createContext(ctx);
src += String.fromCharCode(10) + "__x={state,TODAY,snap,SAVED,save,load,signIn,needPw,logout,API};";
new vm.Script(src).runInContext(ctx);
const X=ctx.__x;

// 1. ไม่มีข้อมูล demo เหลือ
assert.strictEqual(Object.keys(X.state.sched).length,0,'sched ต้องว่าง (seed ถูกลบแล้ว)');
assert.strictEqual(X.state.events.length,0,'events ต้องว่าง');
assert.ok(X.state.holidays.length>0,'holidays ต้องยังมี');

// 2. TODAY = วันนี้จริง
assert.strictEqual(X.TODAY.toDateString(),new Date().toDateString(),'TODAY ต้องเป็นวันนี้');
assert.strictEqual(X.state.month.getMonth(),new Date().getMonth(),'ปฏิทินต้องเปิดที่เดือนปัจจุบัน');

// 3. snapshot ต้อง JSON round-trip ได้ครบ ไม่มี Set/Date ที่พังตอนโหลดกลับ
const s1=JSON.stringify(X.snap());
const back=JSON.parse(s1);
assert.strictEqual(JSON.stringify(Object.keys(back).sort()),JSON.stringify(Array.from(X.SAVED).sort()),'snapshot key ไม่ครบ');
Object.assign(X.state,back);
assert.strictEqual(JSON.stringify(X.snap()),s1,'round-trip แล้วข้อมูลเพี้ยน');

// 4. สถานะหน้าจอ + รหัสผ่าน ต้องไม่ถูกส่งขึ้นเซิร์ฟเวอร์
['tab','filter','draft','loginRole','month','picks','pw','auth'].forEach(k=>
  assert.ok(!X.SAVED.includes(k),k+' ไม่ควรถูกบันทึก'));

// 5. save() ต้องเงียบก่อน load สำเร็จ (กันเอา state เปล่าไปทับของจริงบนเซิร์ฟเวอร์)
X.save(); assert.strictEqual(posts.length,0,'save() ต้องเงียบตอนยังไม่ได้ load');

(async()=>{
  // 6. ทุก request ต้องแนบ role + pw ไปด้วย
  await X.signIn('admin','s3cret');
  assert.strictEqual(posts.length,1,'signIn ต้องยิงไปตรวจกับเซิร์ฟเวอร์');
  assert.deepStrictEqual([posts[0].role,posts[0].pw],['admin','s3cret'],'ต้องส่ง role/pw ไปตรวจ');
  assert.ok(!('data' in posts[0]),'การอ่านต้องไม่ส่ง data ขึ้นไป');

  // 7. หลัง load แล้ว save() ต้องส่ง version ที่เซิร์ฟเวอร์คืนมา ไม่ใช่ 0 (ไม่งั้นโดน stale ตลอด)
  X.state.seq=12345;
  await X.save();
  assert.strictEqual(posts.length,2,'save() ต้องยิงเมื่อข้อมูลเปลี่ยน');
  assert.strictEqual(posts[1].version,9,'ต้องใช้ version ล่าสุดจากเซิร์ฟเวอร์');
  assert.strictEqual(posts[1].data.seq,12345,'ข้อมูลที่ส่งไม่ตรง');

  // 8. logout ต้องล้างรหัสออกจากทั้ง memory และ localStorage
  store['cts-login']='{"pw":"s3cret"}';
  X.logout();
  assert.ok(!store['cts-login'],'logout ต้องลบรหัสที่จำไว้');
  X.state.seq=999;await X.save();
  assert.strictEqual(posts.length,2,'หลัง logout ต้องไม่ยิงข้อมูลขึ้นเซิร์ฟเวอร์อีก');

  // 9. Sales เข้าได้โดยไม่ต้องใช้รหัส · CTS/Admin ต้องใช้
  assert.strictEqual(X.needPw('sales'),false,'Sales ไม่ควรถูกขอรหัส');
  assert.ok(X.needPw('cts')&&X.needPw('admin'),'CTS และ Admin ต้องถูกขอรหัส');
  await X.signIn('sales','');
  assert.strictEqual(posts[posts.length-1].role,'sales','Sales ต้องยิงไปโหลดข้อมูลได้');

  // 10. รหัสผ่านต้องไม่ถูกฝังในไฟล์ที่ push ขึ้น repo สาธารณะ
  //     (Code.gs มีได้บรรทัดเดียวคือคอมเมนต์บอกวิธีตั้งค่า)
  for(const f of ['index.html','sw.js','manifest.json'])
    assert.ok(!/cts1234/i.test(fs.readFileSync(f,'utf8')),f+' มีรหัสผ่านฝังอยู่');
  assert.ok(!/getProperty\(['"]PW['"]\)\s*\|\||PW\s*=\s*['"]cts1234['"]/.test(fs.readFileSync('Code.gs','utf8')),
    'Code.gs ต้องอ่านรหัสจาก Script Properties เท่านั้น');

  console.log('✓ ผ่านทั้ง 10 ข้อ');
})();

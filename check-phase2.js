/* เฟส 2 — เทสว่า load() ดึง jobs จาก Supabase มาประกอบเป็น state.sched ครบ 854 ช่อง
   รัน: node check-phase2.js   (ต้องต่อเน็ตได้ — ยิง REST จริง อ่านอย่างเดียว ไม่เขียนอะไร) */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const L=html.split('\n');
const a=L.findIndex(l=>l.trim()==='<script>'), b=L.findIndex(l=>l.trim()==='</script>');
let src=L.slice(a+1,b).join('\n').replace(/^restoreLogin\(\);.*$/m,'');

const U='https://hxiswcnoxboegudstyng.supabase.co', K='sb_publishable_rDKTTwBvD6GE4DoUeM0O6w_IPPZiVHr';
/* stub supabase-js เท่าที่โค้ดใช้: select/order/range/insert/delete/eq — ยิง PostgREST จริง */
function q(table){
  const st={sel:'*',order:'',filt:'',range:null,method:'GET',body:null};
  const run=async()=>{
    const h={apikey:K,Authorization:'Bearer '+K};
    let url=`${U}/rest/v1/${table}?`+(st.method==='GET'?`select=${encodeURIComponent(st.sel)}${st.order}`:'')+st.filt;
    const opt={method:st.method,headers:h};
    if(st.body){h['Content-Type']='application/json';opt.body=JSON.stringify(st.body);}
    if(st.range)h.Range=st.range[0]+'-'+st.range[1];
    const r=await fetch(url,opt);
    const t=await r.text();
    const data=t?JSON.parse(t):null;
    return r.ok?{data,error:null}:{data:null,error:data};
  };
  const api={
    select(s){st.sel=s;return api;},
    order(c,o){st.order+=`&order=${c}.${o&&o.ascending===false?'desc':'asc'}`;return api;},
    range(f,t){st.range=[f,t];return api;},
    insert(rows){st.method='POST';st.body=rows;return api;},
    delete(){st.method='DELETE';return api;},
    eq(c,v){st.filt+=`&${c}=eq.${encodeURIComponent(v)}`;return api;},
    then(res,rej){return run().then(res,rej);}
  };
  return api;
}
const el=()=>({innerHTML:'',classList:{add(){},remove(){},contains(){return false}},style:{},querySelectorAll:()=>[],
  addEventListener(){},appendChild(){},focus(){},scrollTop:0,dataset:{},textContent:'',value:''});
const store={};
const ctx={console,setTimeout,clearTimeout,Date,Math,JSON,Object,Array,String,Number,Set,Map,Promise,fetch,isNaN,parseInt,
  URL:{createObjectURL:()=>''},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]},
  window:{innerWidth:1200,addEventListener(){},supabase:{createClient:()=>({from:q,auth:{getSession:async()=>({data:{session:null}})}})}},
  document:{getElementById:el,querySelectorAll:()=>[],createElement:el,body:el(),addEventListener(){},execCommand(){}},
  navigator:{clipboard:{writeText:()=>Promise.resolve()}}};
ctx.globalThis=ctx;
vm.createContext(ctx);
src+='\n__x={state,load,save,snap,SAVED,jobRow,jobFrom,flatSched,setJob,jobOf};';
new vm.Script(src).runInContext(ctx);
const X=ctx.__x;
const count=async()=>{
  const r=await fetch(`${U}/rest/v1/jobs?select=id`,{headers:{apikey:K,Authorization:'Bearer '+K,Prefer:'count=exact',Range:'0-0'}});
  return +r.headers.get('content-range').split('/')[1];
};

(async()=>{
  const total=await count();

  assert.strictEqual(Object.keys(X.state.sched).length,0,'ก่อนโหลด sched ต้องว่าง');
  assert.strictEqual(await X.load(),true,'load() ต้องสำเร็จ');

  let cells=0;
  for(const k of Object.keys(X.state.sched))
    for(const cid of Object.keys(X.state.sched[k]))
      for(const sl of ['am','pm'])if(X.state.sched[k][cid][sl])cells++;

  console.log('jobs ใน DB      :',total);
  console.log('ช่องใน sched    :',cells);
  console.log('จำนวนวัน        :',Object.keys(X.state.sched).length);
  assert.strictEqual(cells,total,`sched ต้องมี ${total} ช่อง เท่ากับแถวใน jobs`);

  // โครงสร้างต้องเป็น sched[วัน][ctsId][slot] และแปลงกลับเป็นแถวตาม schema ได้
  const k=Object.keys(X.state.sched).sort()[0], cid=Object.keys(X.state.sched[k])[0];
  const sl=X.state.sched[k][cid].am?'am':'pm', j=X.state.sched[k][cid][sl];
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(k),'คีย์วันต้องเป็น YYYY-MM-DD');
  assert.ok(j&&j.kind,'job ต้องมี kind');
  assert.strictEqual(X.jobOf(k,cid,sl),j,'jobOf ต้องอ่านได้เหมือนเดิม');
  assert.deepStrictEqual(Object.keys(X.jobRow(k,cid,sl,j)).sort(),
    ['attendees','cts_id','date','end_time','kind','product','req_id','slot','start','title'],'คอลัมน์ที่จะเขียนไม่ตรง schema');

  // save() ตอนไม่มีอะไรเปลี่ยน ต้องไม่แตะ DB
  await X.save();
  assert.strictEqual(await count(),total,'save() ที่ไม่มีอะไรเปลี่ยน ต้องไม่ทำแถวหาย');

  // เขียน/ลบผ่าน setJob ต้องสะท้อนใน flatSched (= ชุดแถวที่ save จะเขียน)
  const before=Object.keys(X.flatSched(X.state.sched)).length;
  X.setJob('2099-12-31','belle','am',{kind:'busy',title:'t',start:'09:00',end:'12:00'});
  assert.strictEqual(Object.keys(X.flatSched(X.state.sched)).length,before+1,'setJob ต้องเพิ่มช่อง 1 ช่อง');
  X.setJob('2099-12-31','belle','am',null);
  assert.strictEqual(Object.keys(X.flatSched(X.state.sched)).length,before,'คืนว่างแล้วต้องหายไป');

  // คิวที่มาจากงานที่ CTS ลงเอง (selfId) ต้องไม่ถูกเขียนลง jobs — เป็นของเฟส 3
  X.setJob('2099-12-31','belle','pm',{kind:'busy',title:'se',selfId:'SE1'});
  assert.strictEqual(Object.keys(X.flatSched(X.state.sched)).length,before,'job ที่มี selfId ต้องไม่ถูกบันทึก');
  X.setJob('2099-12-31','belle','pm',null);

  console.log('\n✓ ผ่านทั้งหมด — jobs',total,'แถว ครบเท่าเดิม');
})().catch(e=>{console.error('✗',e.message);process.exit(1);});

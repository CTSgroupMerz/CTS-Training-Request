// Edge Function: แจ้งเตือนบนมือถือ (Web Push) — เรียกจาก trigger push_req() ใน supabase/push.sql เท่านั้น
// body: { type: INSERT|UPDATE, by: auth.uid() ของคนทำ (Sales = null), record, old } · ยืนยันด้วย header x-push-secret
// secrets ที่ต้องตั้ง: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_SECRET (อยู่ใน supabase/.push-keys.txt) · ปิด Verify JWT
// ผู้รับหาจาก push_subs.tags: sale:<รหัส> · sm:<พื้นที่> · lead (PAM/MILK) · mgr (BELLE) · cts:<member_id>
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
webpush.setVapidDetails('https://ctsgroupmerz.github.io/CTS-Training-Request/', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

type Row = Record<string, any>;
// ==== build:start (check-push.js ทดสอบส่วนนี้) ====
const stOf = (r: Row) => (r && r.client && r.client.status) || (r && r.status) || '';
const ctsOf = (r: Row): string[] => {
  const c = (r && r.client) || {};
  return [...new Set([
    ...(c.sessions || []).flatMap((s: Row) => [s.ctsId, ...(s.co || [])]),
    ...(c.days || []).flatMap((d: Row) => (d.items || []).map((i: Row) => i.ctsId)),
  ].filter(Boolean))] as string[];
};
const dmy = (d: string) => { const [y, m, dd] = (d || '').split('-').map(Number); return y ? `${dd}/${m}/${y + 543}` : ''; };
// คำขอ -> { to: tags, title, body, nav } หรือ null = ไม่แจ้ง · byMid = member_id ของคนทำ ('' = Sales/ไม่รู้)
function build(type: string, r: Row, o: Row | null, byMid: string) {
  const c = r.client || {}, st = stOf(r), was = o ? stOf(o) : '';
  const sale = 'sale:' + (c.requesterId || c.area || ''), cts = ctsOf(r).map(id => 'cts:' + id);
  const first = ((c.sessions || []).map((s: Row) => s.date).sort()[0]) || ((c.days || [])[0] || {}).date || '';
  const what = r.mode === 'upc' ? `ทริป UPC ${(c.days || []).length} วัน` : (r.clinic || 'คำขอเทรน');
  const body = [r.id, what, dmy(first)].filter(Boolean).join(' · ');
  let m: { to: string[], title: string } | null = null;
  if (st !== was) m = ({
    sm: { to: ['sm:' + (c.area || '')], title: 'คำขอเทรนใหม่ รอ SM อนุมัติ' },
    pending: { to: ['lead'], title: 'คำขอรอ CTS Leader อนุมัติ' },
    tbc: { to: ['lead'], title: 'คิว TBC ใหม่ รอตรวจ' },
    mgr: { to: ['mgr'], title: 'คำขอรอ CTM อนุมัติ' },
    approved: { to: [sale, ...cts], title: 'คำขอเทรนอนุมัติแล้ว' },
    rejected: { to: [sale], title: 'คำขอเทรนไม่ได้รับอนุมัติ' },
    cancelled: { to: [sale, ...cts, ...ctsOf(o || {}).map(id => 'cts:' + id)], title: 'คิวเทรนถูกยกเลิก' },
    expired: { to: [sale], title: 'คิว TBC หมดอายุ' },
  } as Record<string, { to: string[], title: string }>)[st] || null;
  else if (st === 'approved' && o) {   // สถานะเดิม แต่มีผู้เทรนเพิ่ม/เปลี่ยน -> แจ้งเฉพาะคนใหม่
    const old = new Set(ctsOf(o));
    const fresh = ctsOf(r).filter(id => !old.has(id)).map(id => 'cts:' + id);
    if (fresh.length) m = { to: fresh, title: 'คุณได้รับคิวเทรน — รอรับทราบ' };
  }
  if (!m) return null;
  // ไม่แจ้งคนที่ทำเอง: CTS ที่ล็อกอิน -> ตัด cts:ตัวเอง · Sales (by=null) -> ตัด sale ของตัวเอง ยกเว้น TBC หมดอายุ (ระบบทำ)
  const self = byMid ? 'cts:' + byMid : st === 'expired' ? '' : sale;
  const to = [...new Set(m.to)].filter(t => t && t !== self && !/:$/.test(t));
  return to.length ? { to, title: m.title, body, nav: r.id } : null;
}
// ==== build:end ====

Deno.serve(async req => {
  if (req.headers.get('x-push-secret') !== Deno.env.get('PUSH_SECRET')) return new Response('forbidden', { status: 403 });
  try {
    const { type, record, old, by } = await req.json();
    const byMid = by ? ((await db.from('profiles').select('member_id').eq('id', by).maybeSingle()).data || {}).member_id || '' : '';
    const m = build(type, record, old, byMid);
    if (!m) return new Response('skip');
    const { data: subs } = await db.from('push_subs').select('*').overlaps('tags', m.to);
    const payload = JSON.stringify({ title: m.title, body: m.body, nav: m.nav });
    await Promise.all((subs || []).map(async s => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 }); }
      catch (e: any) {   // เครื่องที่ถอนสิทธิ์/ลบแอปแล้ว -> ลบทิ้ง
        if (e.statusCode === 404 || e.statusCode === 410) await db.from('push_subs').delete().eq('endpoint', s.endpoint);
        else console.error('push', e.statusCode, e.body || e.message);
      }
    }));
    return new Response('sent ' + (subs || []).length);
  } catch (e: any) {
    console.error(e);
    return new Response(e.message, { status: 500 });
  }
});

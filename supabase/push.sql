-- ============================================================
-- แจ้งเตือนบนมือถือ (Web Push) — รันใน Supabase SQL Editor (รันซ้ำได้)
-- คำขอเปลี่ยนสถานะ / ได้ผู้เทรนเพิ่ม -> trigger ส่งแถวไป Edge Function "push" (pg_net) -> ฟังก์ชันหาผู้รับจาก tag เอง
--
-- ตั้งค่าครั้งเดียวหลัง deploy function (ค่าอยู่ใน supabase/.push-secret.sql — ห้าม commit):
--   insert into app_secrets values ('push_secret','<PUSH_SECRET>'),('push_url','https://<project>.supabase.co/functions/v1/<slug>')
--   on conflict (key) do update set value = excluded.value;
-- ยังไม่ตั้ง = ไม่ส่ง (แอปทำงานปกติ)
-- ============================================================
create extension if not exists pg_net;
create table if not exists public.app_secrets (key text primary key, value text not null);
alter table public.app_secrets enable row level security;   -- ไม่มี policy = แอปอ่านไม่ได้

-- 1 แถว = 1 เครื่อง · tags = ใครบ้างที่เครื่องนี้แทน เช่น {sale:C01} {cts:narakamon,lead} {sm:KAE1,sm:KAE2}
-- ponytail: Sales ไม่ได้ล็อกอิน (anon) จึงลงทะเบียน tag ของตัวเองได้เอง — ระดับเดียวกับที่ anon อ่าน/เขียนคำขอได้อยู่แล้ว
create table if not exists public.push_subs (
  endpoint   text primary key,
  tags       text[] not null default '{}',
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;   -- ไม่มี policy: เขียนผ่าน RPC เท่านั้น
create index if not exists push_subs_tags on public.push_subs using gin (tags);

create or replace function public.save_push_sub(p_endpoint text, p_p256dh text, p_auth text, p_tags text[]) returns void
language sql security definer set search_path = public as $$
  insert into push_subs (endpoint, tags, p256dh, auth) values (p_endpoint, p_tags, p_p256dh, p_auth)
  on conflict (endpoint) do update set tags = excluded.tags, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now()
$$;
create or replace function public.drop_push_sub(p_endpoint text) returns void
language sql security definer set search_path = public as $$ delete from push_subs where endpoint = p_endpoint $$;
grant execute on function public.save_push_sub(text, text, text, text[]) to anon, authenticated;
grant execute on function public.drop_push_sub(text) to anon, authenticated;

-- สถานะจริงอยู่ใน client.status ก่อน (เช่น expired) · ส่งเฉพาะเมื่อสถานะเปลี่ยน หรือรายการ session/วัน UPC เปลี่ยน (เปลี่ยน/เพิ่มผู้เทรน)
create or replace function public.push_req() returns trigger
language plpgsql security definer set search_path = public as $$
declare s text; u text;
begin
  if tg_op = 'UPDATE'
     and coalesce(new.client->>'status', new.status) is not distinct from coalesce(old.client->>'status', old.status)
     and (new.client->'sessions') is not distinct from (old.client->'sessions')
     and (new.client->'days') is not distinct from (old.client->'days') then
    return null;
  end if;
  select value into s from app_secrets where key = 'push_secret';
  select value into u from app_secrets where key = 'push_url';
  if s is not null and u is not null then
    perform net.http_post(u,
      jsonb_build_object('type', tg_op, 'by', auth.uid(), 'record', to_jsonb(new),
                         'old', case when tg_op = 'UPDATE' then to_jsonb(old) end),
      '{}'::jsonb, jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', s));
  end if;
  return null;
end $$;
drop trigger if exists push_req on public.requests;
create trigger push_req after insert or update on public.requests for each row execute function public.push_req();

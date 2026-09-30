-- ============================================================
-- ถังเก็บรูปงานกลาง MA (index.html -> upPhoto())
-- รูปอยู่ใน Storage ไม่ฝังในตาราง events เพราะแอปโหลด events ใหม่ทุก 30 วิ
-- bucket public = ใครมี URL ก็ดูรูปได้ (ทุกปฏิทินต้องเห็นรูป) · อัปโหลดได้เฉพาะ Admin
-- รันครั้งเดียวใน Supabase SQL editor
-- ============================================================
insert into storage.buckets (id, name, public)
values ('ma-photos', 'ma-photos', true)
on conflict (id) do nothing;

create policy "ma_photos_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ma-photos' and public.my_role() = 'Admin');

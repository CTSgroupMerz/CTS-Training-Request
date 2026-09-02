-- CTS Training Request — Seed Data (ช่วงเริ่มต้น)
-- รันหลัง schema.sql — ข้ามของที่มีแล้ว
-- ข้อมูลจาก index.html (CTS/AREA_CFG/HOLIDAYS_SEED) + 1 Admin

-- ============ SALES AREAS — พื้นที่ขาย (จาก AREA_CFG) ============
insert into public.sales_areas (area, team) values
  ('Champion','A'), ('Victory','A'), ('KAE4','A'),
  ('Winner','B'), ('KAE1','B'), ('KAE2','B'), ('KAE3','B'), ('UPC','BOTH')
on conflict (area) do nothing;

insert into public.sales_codes (area, code) values
  ('Champion','C01'),('Champion','C02'),('Champion','C03'),('Champion','C04'),('Champion','C05'),
  ('Victory','V01'),('Victory','V02'),('Victory','V03'),('Victory','V04'),('Victory','V05'),
  ('Winner','W01'),('Winner','W02'),('Winner','W03'),('Winner','W04'),('Winner','W05'),
  ('UPC','UPC1'),('UPC','UPC2'),('UPC','UPC3'),('UPC','UPC4'),('UPC','UPC5'),('UPC','UPC6')
on conflict (area, code) do nothing;

-- ============ HOLIDAYS — วันหยุด (จาก HOLIDAYS_SEED) ============
insert into public.holidays (date, name) values
  ('2026-07-28','วันเฉลิมพระชนมพรรษา ร.10'),
  ('2026-07-29','วันอาสาฬหบูชา'),
  ('2026-07-30','วันเข้าพรรษา'),
  ('2026-08-12','วันแม่แห่งชาติ'),
  ('2026-10-13','วันคล้ายวันสวรรคต ร.9'),
  ('2026-10-23','วันปิยมหาราช')
on conflict (date) do nothing;

-- ============ PROFILES — สมาชิก (สร้างผ่าน Supabase Auth ก่อน แล้วผูก member_id) ============
-- หมายเหตุ: id (uuid) ต้องมาจาก auth.users ของแต่ละคน
-- ผมสร้างรายชื่อไว้ให้ — ต่อเมื่อเพิ่ม auth user แล้ว update id + login email จริง
-- เบื้องต้น ใส่ member_id + ข้อมูลคนก่อน (id = NULL รอผูก)  **ดูหมายเหตุด้านล่าง**

-- ============ TEAMS — ทีม (จาก TEAMS/LEAD_IDS) ============
-- insert หลัง profiles มีคนครบ — ไม่ใส่ตอนนี้ เพื่อหลีกเลี่ยง FK ก่อน auth user ผูก

-- ============ MODULES / PRODUCTS / LEVELS / EVTYPE / TOPIC_TAGS / EXP ============
-- คงไว้ในโค้ด (index.html) ตามที่ตกลง — ไม่ย้ายเข้า DB

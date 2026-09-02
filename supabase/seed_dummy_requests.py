#!/usr/bin/env python3
"""
Seed dummy `requests` (30 รายการ) เข้า Supabase — สำหรับทดสอบ frontend.
โครงสร้างตรงกับ schema.sql (normal + upc 2 modes), ผูกกับ profiles จริง.

ORDER ที่ถูกต้อง (สำคัญ!):
  1. INSERT requests ทั้งหมดก่อน (parents)
  2. สร้าง+INSERT upc_days (FK -> requests)
  3. สร้าง+INSERT upc_items (FK -> upc_days)
  4. INSERT request_sessions (FK -> requests)

รัน: python seed_dummy_requests.py
"""
import json, random, datetime, urllib.request, urllib.error

BASE = "https://hxiswcnoxboegudstyng.supabase.co"
KEY  = "sb_publishable_rDKTTwBvD6GE4DoUeM0O6w_IPPZiVHr"

def get(path):
    req = urllib.request.Request(BASE + f"/rest/v1/{path}")
    req.add_header("apikey", KEY); req.add_header("Authorization", "Bearer " + KEY)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())

def post(path, rows):
    req = urllib.request.Request(BASE + f"/rest/v1/{path}", data=json.dumps(rows).encode(), method="POST")
    req.add_header("apikey", KEY); req.add_header("Authorization", "Bearer " + KEY)
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=representation")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

profiles = get("profiles?select=member_id,id")
MID2UUID = {p["member_id"]: p["id"] for p in profiles}
print("Profiles:", len(MID2UUID))

PRODUCTS = ['Ultherapy','Xeomin','Belotero Revive','Belotero Soft','Belotero Balance',
            'Belotero Intense','Belotero Volume','Radiesse Classic','Radiesse Plus']
MODULES  = ['MAX-Entry','MAX-A','MAX-B']
LEVELS   = ['Standard','Advance']
CTS_IDS  = [x for x in MID2UUID if x in ('narakamon','witchukorn','pariyachat','onkamol','koollanut','pitchaporn')]
LEAD_IDS = [x for x in MID2UUID if x in ('parichat','kanwara')]
PROVINCES= ['ขอนแก่น','มหาสารคาม','ร้อยเอ็ด','กาฬสินธุ์','อุดรธานี','นครราชสีมา']
CLINICS  = ['คลินิกเด่นอนุสรณ์','คลินิกสมาร์ทบิวตี้','โรงพยาบาลศรีนครินทร์','คลินิกวิเศษแพทย์',
            'คลินิกแสนสุข','คลินิกทันตกรรมซีไนน์','โรงพยาบาลขอนแก่นราม','คลินิกเลิศล้ำบิวตี้']
TOPICS   = ['เทคนิคการฉีด Revive','Product Intro Xeomin','Advanced Filler technique',
            'Ultherapy Treatment','Radiesse contouring','Complication management',
            'Patient assessment','Hands-on practice']
EXP      = ['Beginner — ยังไม่เคยฉีด / ไม่เคยใช้เครื่อง',
            'Intermediate — เคยใช้บ้าง ต้องมีคนคุม',
            'Advanced — ใช้ประจำ ต้องการ technique ใหม่']

random.seed(42)
def ri(a,b): return random.randint(a,b)
def rc(seq): return random.choice(seq)
def dstr(off): return (datetime.date(2026,9,15)+datetime.timedelta(days=off)).isoformat()
def ts(off): return (datetime.datetime(2026,9,15,9,0)+datetime.timedelta(days=off)).isoformat()

# ============ STEP 1: build + INSERT requests ============
requests, sessions, upc_plans = [], [], []
seq = 1041
for i in range(30):
    rid = f"TR{seq}"; seq += 1
    is_upc = (i % 6 == 0)
    status = rc(['pending','approved','pending','tbc','approved','rejected','approved'])
    products = [rc(PRODUCTS) for _ in range(ri(1,3))]
    base = {"id": rid, "mode": "upc" if is_upc else "normal", "status": status,
        "module": rc(MODULES), "level": rc(LEVELS), "products": products,
        "topic": rc(TOPICS), "clinic": rc(CLINICS),
        "map_url": "https://maps.google.com/?q=test", "doctors": ri(1,12),
        "exp": rc(EXP), "hands_on": random.random()<0.3,
        "requester": rc(CLINICS), "requester_profile_id": MID2UUID[rc(list(MID2UUID.keys()))],
        "approved_by": MID2UUID[rc(LEAD_IDS)] if status=="approved" else None,
        "approved_at": ts(ri(0,5)) if status=="approved" else None}
    if base["hands_on"]:
        base["ho_product"]=rc(PRODUCTS); base["ho_cases"]=ri(1,5)
    requests.append(base)
    if is_upc:
        upc_plans.append({"rid": rid, "days": ri(2,4)})
    else:
        n_sess = ri(1,3)
        for s in range(n_sess):
            sessions.append({"request_id": rid, "date": dstr(ri(5,40)),
                "slot": rc(['am','pm']), "start": "09:00" if s%2==0 else "13:00",
                "end_time": "12:00" if s%2==0 else "16:00",
                "cts_id": rc(CTS_IDS), "product": products[s % len(products)],
                "topic": rc(TOPICS), "full_day": False})

print(f"Inserting requests ({len(requests)})...")
ok_req = 0
for r in requests:
    try:
        post("requests", [r]); ok_req += 1
    except urllib.error.HTTPError as e:
        print(f"  FAIL req {r['id']}:", json.loads(e.read().decode()).get("message"))
print("  requests:", ok_req, "/", len(requests))

# ============ STEP 2: BUILD + INSERT upc_days (after requests exist) ============
upc_items = []
ok_day = 0
for plan in upc_plans:
    rid = plan["rid"]
    for d in range(plan["days"]):
        upcd = {"request_id": rid, "date": dstr(ri(5,30)), "cts_id": rc(CTS_IDS)}
        try:
            got = post("upc_days", [upcd])
            day_id = got[0]["id"]; ok_day += 1
            for _ in range(ri(1,3)):
                upc_items.append({"upc_day_id": day_id, "clinic": rc(CLINICS),
                    "province": rc(PROVINCES), "module": rc(MODULES), "level": rc(LEVELS),
                    "product": rc(PRODUCTS), "topic": rc(TOPICS), "doctors": str(ri(1,10)),
                    "exp": rc(EXP), "hands_on": random.random()<0.3})
        except urllib.error.HTTPError as e:
            print(f"  FAIL upc_day {rid}:", json.loads(e.read().decode()).get("message"))
print("  upc_days:", ok_day, "/", sum(p["days"] for p in upc_plans))

# ============ STEP 3: INSERT upc_items ============
ok_item = 0
for it in upc_items:
    try:
        post("upc_items", [it]); ok_item += 1
    except urllib.error.HTTPError as e:
        print(f"  FAIL upc_item:", json.loads(e.read().decode()).get("message"))
print("  upc_items:", ok_item, "/", len(upc_items))

# ============ STEP 4: INSERT request_sessions ============
ok_sess = 0
for s in sessions:
    try:
        post("request_sessions", [s]); ok_sess += 1
    except urllib.error.HTTPError as e:
        print(f"  FAIL sess {s['request_id']}:", json.loads(e.read().decode()).get("message"))
print("  request_sessions:", ok_sess, "/", len(sessions))

print("DONE — requests:", ok_req, "| sessions:", ok_sess, "| upc_days:", ok_day, "| upc_items:", ok_item)

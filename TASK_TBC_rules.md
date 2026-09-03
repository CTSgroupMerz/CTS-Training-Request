# TASK: TBC Queue Rules — 3 changes (calendar + form + notification)

File: `C:/Users/TUF GAMING/Desktop/งานอีเบล/งานที่3/index.html`
Context: after Supabase migration, app uses `state.sched` (from jobs 854) + `requests` (TBC flow).
`TBC_DAYS=3` is ALREADY defined at ~line 2761 — use it as the single source of truth.

---

## Change 1 — TBC notification shows "เหลืออีก 2 วัน" → must show 3 (from TBC_DAYS)
**Problem:** In the TBC alert box (`tbcbar`, around line 2904) and anywhere the "days left"
is displayed, it shows "เหลืออีก N วัน". User reports it shows **2** but lock is **3** days.
- Find EVERY place displaying "เหลืออีก ... วัน" / "days left" / "tbcLeft".
- Ensure it computes from `TBC_DAYS` (i.e. uses `tbcLeft(r)` / `tbcDeadline(r)`), NOT a hardcoded 2.
- If `tbcLeft` math under-counts (e.g. `Math.ceil` off-by-one at boundary), fix `tbcLeft` to
  return the correct remaining days for a 3-day lock. Aim: a TBC request created now shows
  "เหลืออีก 3 วัน ก่อนปล่อยวันคืนระบบ".
- Do NOT change `TBC_DAYS` value (keep 3). Make sure no literal `2` is used for TBC day count
  (the only "2 วัน" occurrence is a mobile-layout comment, not TBC — leave it).

## Change 2 — When filling a TBC request, hide "ส่งคำขอ" (only allow "ล็อกวันไว้ก่อน (คิว TBC)")
**Problem:** In the request form (`openForm`), both buttons show:
  - `btnSend` = "ส่งคำขอ"  (~line 2520)
  - `btnTbc`  = "🔒 ล็อกวันไว้ก่อน (คิว TBC)"  (~line 2521)
**Desired:** When the form is in TBC mode (`state.tbcMode === true`) — the user is choosing a
TBC queue (lock days first) — the "ส่งคำขอ" button (`btnSend`) must NOT appear. Only
"ล็อกวันไว้ก่อน (คิว TBC)" (`btnTbc`) + "ยกเลิกคำขอนี้" (`btnCancel`) remain.
- Read `state.tbcMode` to decide. When `state.tbcMode` is true → hide/remove `btnSend`, show `btnTbc`.
  When not TBC mode → keep both as now (or only Send; TBC button stays per current behavior — confirm).
- Prevents accidental "ส่งคำขอ" (send request) on a TBC queue. Don't change submitTBC / submitReq logic.

## Change 3 — Calendar: TBC queue must be VISIBLE as "TBC" with a RED badge before the title
**Problem:** In the CTS calendar (week view, `weekHTML` around line 1680; and the day/entry
list around line 2237), a TBC job currently shows just `(TBC)` plain text after the title.
**Desired:** TBC jobs must be clearly identifiable — show a **red "TBC" badge/label BEFORE the
job title** (in front of the title, in red), so the leader instantly sees an unconfirmed queue.
- Where you render a job card in the calendar (the `.job`/`.etx2`/`.jobcard` elements that show
  `kind==='tbc'`), prepend a red `<span class="tbctag">TBC</span>` (or reuse `.tag` styling with
  red) before the title when `job.kind==='tbc'`.
- Add a small `.tbctag` CSS class: red background/red text, small pill, bold — visible on the card.
- Keep the existing `.tbcjob` stripe styling if present (that's fine for the cell background),
  but ADD the explicit red "TBC" label so it's unmistakable.
- Apply in BOTH the CTS week view (canSeeNames branch ~line 1668) and the entry/day list (line 2237).

---

## Rules (from the SUPABASE migration — phases already done, do NOT touch)
- Do NOT change: `saveReq`/`toRow`/auth (Phase 1), `setJob`/`jobOf`/`jobFrom`/`load`/`dayEntries`
  from Phase 2 (jobs) — unless Change 1 fix requires touching `tbcLeft` (allowed, minimal).
- Do NOT touch skills/holidays/events (Phase 3). Do NOT change DB/RLS.
- Preserve everything else. Use `C:/Users/...` paths.

## Definition of Done
- [ ] TBC alert shows "เหลืออีก 3 วัน" (from TBC_DAYS), not 2, everywhere it appears.
- [ ] In TBC mode form, no "ส่งคำขอ" button visible — only "ล็อกวันไว้ก่อน (คิว TBC)" + cancel.
- [ ] Calendar TBC queue shows a red "TBC" badge before the title (both week view + list).
- [ ] `node check-cal.js` still passes (verify no regression) — or the pre-existing tests pass.
- [ ] Script compiles (main <script> block syntax OK).
- [ ] Report exactly what you changed with line numbers.

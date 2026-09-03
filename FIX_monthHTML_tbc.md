# FIX: monthHTML missing red TBC badge (calendar month view)

File: `C:/Users/TUF GAMING/Desktop/งานอีเบล/งานที่3/index.html`

## Context
The red TBC badge (`.tbctag` / helper `tbcTag(j)`) was added to the WEEK view (`weekHTML`,
~line 1685) and the day timeline/list (~2242, 2250) — verified working. But the **month view
(`monthHTML`)** was missed: TBC jobs there show NO red badge.

## What to do
In `monthHTML()`, inside the `jobs.map(o=>{...})` block (~line 1622-1629), there are TWO chip
variants (based on `one = NARROW()`):
- "one" variant (`~1623-1624`): `<button class="evchip one" ...>${okMark(o.job)}${esc(o.job.title||'งาน')}</button>`
- "two" variant (`~1625-1629`): `<button class="evchip two" ...>... <span class="etx">${okMark(o.job)}${leadText(o.job)?leadText(o.job)+' · ':''}${esc(o.job.title||'')}</span></button>`

Add `tbcTag(o.job)` BEFORE the job title (like weekHTML does):
- one: `${okMark(o.job)}${tbcTag(o.job)}${esc(o.job.title||'งาน')}`
- two: `${okMark(o.job)}${tbcTag(o.job)}${leadText(o.job)?leadText(o.job)+' · ':''}${esc(o.job.title||'')}`

The `tbcTag` helper already exists (~line 1093): `const tbcTag=j=>j&&j.kind==='tbc'?'<span class="tbctag">TBC</span>':''`
The `.tbctag` CSS rule already exists (~line 663). Do NOT redefine either.

## Do NOT
- Do NOT change `.tbctag` CSS or `tbcTag` helper (they're fine).
- Do NOT touch weekHTML/day list (already correct).
- Do NOT touch Phase 1/2/3 core, skills/holidays/events, DB/RLS, `TBC_DAYS`.
- Only edit the `monthHTML` chip rendering as described.

## Definition of Done
- [ ] In month view, a `kind==='tbc'` job shows `<span class="tbctag">TBC</span>` before its title
      (in BOTH the "one" narrow and "two" normal chip variants).
- [ ] `.tbctag` count > 0 in month view with a TBC request present.
- [ ] `node check-cal.js` still passes.
- [ ] Main `index.html` script block still compiles (syntax OK).
- [ ] Report the exact lines changed.

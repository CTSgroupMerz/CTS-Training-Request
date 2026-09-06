-- Root cause: public.jobs only has a non-unique index on (date,cts_id,slot)
-- (idx_jobs_date_cts, schema.sql:125). Postgres upsert(...,{onConflict:...})
-- requires a UNIQUE index/constraint on the conflict columns, so index.html's
-- saveSched() falls back to delete-then-insert per key (42P10). That fallback
-- is two round trips and not atomic: two browser tabs saving at the same time
-- can interleave delete/insert and one tab's row disappears.
--
-- This migration makes the index unique so the app's upsert path (already
-- wired in index.html, guarded by jobsUniqueReady) becomes atomic. Safe to
-- run more than once.

-- 1) drop rows that already collide on (date,cts_id,slot), keeping the most
--    recently written one (highest id), so the unique index can be created.
delete from public.jobs a
where exists (
  select 1 from public.jobs b
  where b.date = a.date and b.cts_id = a.cts_id and b.slot = a.slot
    and b.id > a.id
);

-- 2) replace the non-unique index with a unique one on the same columns.
drop index if exists idx_jobs_date_cts;
create unique index if not exists idx_jobs_date_cts on public.jobs(date, cts_id, slot);

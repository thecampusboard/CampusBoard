-- ============================================================================
-- CampusBoard — fix club creation/bulk-import + add club lead fields
--
-- 1. 011_production_hardening.sql revoked EXECUTE on
--    public.socials_are_safe(jsonb) from public/anon/authenticated (#5 in
--    that migration). That function is called directly by the
--    clubs_socials_safe_urls_check CHECK constraint on public.clubs, and a
--    CHECK constraint always runs as the role performing the INSERT/UPDATE
--    (the constraint is not itself SECURITY DEFINER, only the function is —
--    SECURITY DEFINER only changes the privileges the function body runs
--    with once it's called, it does not grant anyone permission to call the
--    function in the first place). So every insert/update to public.clubs —
--    "New club", editing a club, and every row a bulk import inserts — hit
--    "permission denied for function socials_are_safe", even for Admin,
--    even with an empty socials array. Restore EXECUTE for authenticated
--    (the only role clubs_admin_write/clubs_admin_update ever allow to
--    write a club row in the first place, so this grants no new access).
-- ----------------------------------------------------------------------------
grant execute on function public.socials_are_safe(jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Club head (student lead) and faculty lead names, shown alongside the
--    existing club profile fields. Optional, free text, default '' so
--    every existing row and every row created through the pre-existing
--    "New club" form path is unaffected.
-- ----------------------------------------------------------------------------
alter table public.clubs add column head_name text not null default '';
alter table public.clubs add column faculty_lead text not null default '';

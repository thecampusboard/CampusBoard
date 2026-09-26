-- ============================================================================
-- CampusBoard — Admin user removal (database-side safety net).
--
-- Actually deleting a user requires the Supabase Auth Admin API, which needs
-- the service-role key. That key must NEVER reach the browser, so removal is
-- performed by the `admin-delete-user` Edge Function
-- (supabase/functions/admin-delete-user), which verifies the caller is an
-- Admin server-side before deleting. Deleting the auth.users row cascades to
-- public.profiles (001: `on delete cascade`), and from there:
--   * user-authored notices/events/opportunities -> created_by set null
--     (the content stays, it just loses its author)
--   * reviewed_by / updated_by columns            -> set null
--   * buy_sell_listings (owner_id)                -> deleted
--   * event_registrations / opportunity_saves /
--     club_memberships / community_interests      -> deleted
--   * analytics_events.user_id                    -> set null
--
-- This migration adds one guard so no code path — Edge Function, SQL Editor
-- or otherwise — can remove the last remaining Admin and lock everyone out.
-- ============================================================================
create or replace function public.prevent_last_admin_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if old.role = 'admin'
     and not exists (
       select 1 from public.profiles where role = 'admin' and id <> old.id
     ) then
    raise exception 'The last remaining Admin cannot be removed.';
  end if;
  return old;
end;
$fn$;

create trigger profiles_prevent_last_admin_delete
  before delete on public.profiles
  for each row execute function public.prevent_last_admin_delete();

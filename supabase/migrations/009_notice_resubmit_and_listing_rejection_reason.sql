-- ============================================================================
-- CampusBoard — notice "Edit & Resubmit" + Buy & Sell rejection reason
--
-- Found during the second-pass audit:
--
-- 1. A rejected notice was a dead end. 006_notice_workflow_and_club_images.sql
--    gave students notices_delete_own_pending (delete while still 'pending')
--    but nothing let them touch a 'rejected' row at all — no update policy,
--    no delete policy for that status. The student could see the rejection
--    reason forever and do nothing about it. Fix: a narrowly-scoped update
--    policy that lets a student edit the CONTENT of their own pending or
--    rejected notice and resubmit it, but — same as every other
--    student-facing policy on this table — never lets them approve
--    themselves: the WITH CHECK clause only ever allows the result to land
--    back at 'pending', and enforce_notice_review() (006) already resets
--    reviewed_by/reviewed_at/rejection_reason to null whenever status moves
--    to 'pending', so a resubmission always goes back through a full review.
--
-- 2. buy_sell_listings had no rejection_reason column, so a rejected seller
--    had no way to find out what to fix — unlike notices, which already had
--    this. Fix: add the column (nullable, Admin-only writable — same
--    protection enforce_listing_transition() already gives approved_at/
--    rejected_at/expires_at) and let Admin set it in the same update that
--    rejects a listing.
--
-- Safe to run on top of 001-008.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. notices — let a student resubmit their own pending/rejected notice.
-- ----------------------------------------------------------------------------
create policy notices_student_resubmit on public.notices
  for update to authenticated
  using (created_by = auth.uid() and status in ('pending', 'rejected'))
  with check (created_by = auth.uid() and status = 'pending');

-- ----------------------------------------------------------------------------
-- 2. buy_sell_listings — rejection reason, Admin-set only.
-- ----------------------------------------------------------------------------
alter table public.buy_sell_listings add column rejection_reason text;

create or replace function public.enforce_listing_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    if new.status = 'approved' and old.status is distinct from 'approved' then
      new.approved_at := now();
      new.expires_at := now() + interval '30 days';
      new.rejected_at := null;
      new.rejection_reason := null;
    elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
      if new.rejection_reason is null or btrim(new.rejection_reason) = '' then
        raise exception 'Provide a rejection reason.';
      end if;
      new.rejected_at := now();
      new.approved_at := null;
      new.expires_at := null;
    end if;
    new.updated_at := now();
    return new;
  end if;

  -- Non-admin (must also be the owner — RLS's USING clause already enforces
  -- that for the update policy, this is defence in depth).
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id cannot be changed.';
  end if;
  if new.approved_at is distinct from old.approved_at
     or new.rejected_at is distinct from old.rejected_at
     or new.expires_at is distinct from old.expires_at
     or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'Only Admin can approve or reject a listing.';
  end if;
  if new.status is distinct from old.status then
    if old.status = 'payment_pending' and new.status = 'payment_submitted' then
      null; -- "I've paid" step — no extra requirement yet, screenshot comes next.
    elsif old.status = 'payment_submitted' and new.status = 'pending_approval' then
      if new.payment_screenshot_path is null then
        raise exception 'Upload a payment screenshot before submitting for approval.';
      end if;
    else
      raise exception 'Only Admin can approve, reject or otherwise change that status.';
    end if;
  end if;
  if new.payment_screenshot_path is distinct from old.payment_screenshot_path
     and not (old.status = 'payment_submitted' and new.status = 'pending_approval') then
    raise exception 'payment_screenshot_path can only be set when submitting for approval.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Expose the new column through the same public view every listing read
-- already goes through (003/004_hardening.sql). No masking needed here —
-- unlike seller_phone/payment_screenshot_path this isn't sensitive, and the
-- base table's RLS already limits which *rows* (therefore whose rejection
-- reasons) are visible to a given caller in the first place.
create or replace view public.buy_sell_listings_public
with (security_invoker = true) as
select
  id,
  owner_id,
  listing_type,
  title,
  price,
  condition,
  category,
  description,
  seller_name,
  case
    when auth.uid() = owner_id or public.is_admin() then seller_phone
    else null
  end as seller_phone,
  images,
  case
    when auth.uid() = owner_id or public.is_admin() then payment_screenshot_path
    else null
  end as payment_screenshot_path,
  status,
  fee,
  submitted_at,
  approved_at,
  rejected_at,
  expires_at,
  views,
  contact_reveals,
  created_at,
  updated_at,
  rejection_reason
from public.buy_sell_listings;

grant select on public.buy_sell_listings_public to anon, authenticated;

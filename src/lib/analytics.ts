import { supabase } from "@/lib/supabase";

export type AnalyticsEntity = "notice" | "event" | "club" | "opportunity" | "listing";
export type AnalyticsEventType = "view" | "register_click" | "apply_click" | "contact_reveal";

/**
 * Logs a view/click and atomically bumps the matching counter column
 * (views / apply_clicks / register_clicks / contact_reveals) on the source
 * table, via the `record_analytics_event` RPC (see
 * supabase/migrations/004_hardening.sql). Fire-and-forget: tracking must
 * never block or break the page it's called from, so failures are
 * swallowed. Anonymous visitors are allowed to log views — the RPC is
 * security definer and grants execute to `anon`, mirroring the old
 * insert-only RLS policy it replaces.
 */
export function logEvent(
  entityType: AnalyticsEntity,
  entityId: string,
  eventType: AnalyticsEventType,
) {
  supabase
    .rpc("record_analytics_event", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_event_type: eventType,
    })
    .then(({ error }) => {
      if (error) console.debug("analytics log skipped:", error.message);
    });
}

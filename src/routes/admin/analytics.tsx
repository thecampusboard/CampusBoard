import { useEffect, useState } from "react";
import { BarChart3, Eye } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useContent } from "@/lib/content";
import { usePageMeta } from "@/lib/seo";
import { CardSkeleton, ErrorState } from "@/components/bento";

type EntityType = "notice" | "event" | "club" | "opportunity" | "listing";
type EventType = "view" | "register_click" | "apply_click" | "contact_reveal";

interface BreakdownRow {
  entity_type: EntityType;
  event_type: EventType;
  total: number;
}

interface TopRow {
  entity_type: EntityType;
  entity_id: string;
  views: number;
}

const ENTITY_LABEL: Record<EntityType, string> = {
  notice: "Notices",
  event: "Events",
  club: "Clubs",
  opportunity: "Opportunities",
  listing: "Buy & Sell",
};

const EVENT_LABEL: Record<EventType, string> = {
  view: "Views",
  register_click: "Register clicks",
  apply_click: "Apply clicks",
  contact_reveal: "Contacts revealed",
};

export default function AdminAnalyticsPage() {
  usePageMeta("Analytics — Admin — CampusBoard", "Engagement breakdown across every content type.");
  const { notices, events, clubs, opportunities, listings } = useContent();
  const [breakdown, setBreakdown] = useState<BreakdownRow[] | null>(null);
  const [top, setTop] = useState<TopRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("analytics_breakdown").select("entity_type, event_type, total"),
      supabase.from("analytics_top_entities").select("entity_type, entity_id, views").limit(60),
    ]).then(([b, t]) => {
      if (!active) return;
      if (b.error || t.error) {
        setError(b.error?.message ?? t.error?.message ?? "Couldn't load analytics.");
        return;
      }
      setBreakdown((b.data ?? []) as BreakdownRow[]);
      setTop((t.data ?? []) as TopRow[]);
    });
    return () => {
      active = false;
    };
  }, []);

  const titleFor = (entity: EntityType, id: string) => {
    if (entity === "notice") return notices.find((n) => n.id === id)?.title;
    if (entity === "event") return events.find((e) => e.id === id)?.title;
    if (entity === "club") return clubs.find((c) => c.id === id)?.name;
    if (entity === "opportunity") return opportunities.find((o) => o.id === id)?.title;
    return listings.find((l) => l.id === id)?.title;
  };

  const entityTypes: EntityType[] = ["notice", "event", "club", "opportunity", "listing"];
  const topOverall = (top ?? []).sort((a, b) => b.views - a.views).slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="bento p-6">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <BarChart3 className="size-6 shrink-0" aria-hidden="true" />
          Analytics
        </h1>
        <p className="pt-1 text-sm text-muted-foreground">
          Engagement per content type, plus your most-viewed pages.
        </p>
      </div>

      {error ? (
        <ErrorState hint={error} />
      ) : breakdown === null ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entityTypes.map((entity) => {
              const rows = breakdown.filter((r) => r.entity_type === entity);
              const total = rows.reduce((sum, r) => sum + r.total, 0);
              if (total === 0) return null;
              return (
                <div key={entity} className="bento p-5">
                  <p className="text-sm font-bold">{ENTITY_LABEL[entity]}</p>
                  <ul className="mt-2 space-y-1">
                    {rows.map((r) => (
                      <li key={r.event_type} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{EVENT_LABEL[r.event_type]}</span>
                        <span className="font-bold">{r.total.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <section className="bento p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Eye className="size-4 shrink-0" aria-hidden="true" />
              Most viewed
            </h2>
            {topOverall.length === 0 ? (
              <p className="pt-3 text-sm text-muted-foreground">No views recorded yet.</p>
            ) : (
              <ol className="mt-3 space-y-1.5">
                {topOverall.map((r, i) => {
                  const title = titleFor(r.entity_type, r.entity_id);
                  return (
                    <li
                      key={`${r.entity_type}-${r.entity_id}`}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-5 shrink-0 text-right text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {title ?? r.entity_id}
                      </span>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">
                        {ENTITY_LABEL[r.entity_type]}
                      </span>
                      <span className="shrink-0 text-xs font-bold">{r.views} views</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}

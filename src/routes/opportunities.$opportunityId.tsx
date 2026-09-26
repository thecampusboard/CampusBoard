import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Calendar,
  GraduationCap,
  IndianRupee,
  MapPin,
  Star,
  Users,
} from "lucide-react";

import { ProtectedAction } from "@/components/protected-action";
import { EngagementToggle } from "@/components/engagement-toggle";
import { useContent } from "@/lib/content";
import { formatDate } from "@/lib/data";
import { usePageMeta } from "@/lib/seo";
import { logEvent } from "@/lib/analytics";
import { hasRealUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-foreground">
        {icon}
      </span>
      <div>
        <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

export default function OpportunityDetail() {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { opportunities, savedOpportunityIds, toggleOpportunitySave } = useContent();
  const opportunity = opportunities.find((o) => o.id === opportunityId);

  usePageMeta(
    opportunity ? `${opportunity.title} — CampusBoard` : "Opportunity — CampusBoard",
    "Role details, eligibility, skills and how to apply.",
  );

  useEffect(() => {
    if (opportunity) logEvent("opportunity", opportunity.id, "view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunity?.id]);

  if (!opportunity) {
    return (
      <Card className="shadow-bento rounded-2xl border-border p-8">
        <h1 className="text-2xl font-bold text-foreground">Opportunity not found</h1>
        <p className="pt-2 text-sm text-muted-foreground">
          This opportunity may have been removed or the link is incorrect.
        </p>
        <Link
          to="/opportunities"
          className="pt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to opportunities
        </Link>
      </Card>
    );
  }

  const deadlinePassed = new Date(opportunity.deadline + "T23:59:59") < new Date();

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <Link
        to="/opportunities"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to opportunities
      </Link>
      <Card className="shadow-bento rounded-2xl border-border overflow-hidden">
        <div className="h-2 w-full bg-primary" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
              {opportunity.organization} · {opportunity.type}
            </p>
            {opportunity.featured && (
              <Badge
                variant="secondary"
                className="gap-1.5 rounded-full bg-primary/10 text-primary"
              >
                <Star className="size-3.5 fill-current" aria-hidden="true" />
                Featured
              </Badge>
            )}
          </div>
          <h1 className="pt-2 text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {opportunity.title}
          </h1>
          <p className="pt-1 text-sm font-semibold text-muted-foreground">{opportunity.position}</p>

          <div className="mt-6 grid gap-5 rounded-2xl bg-secondary/50 p-5 sm:grid-cols-2">
            <InfoRow
              icon={<MapPin className="size-4" aria-hidden="true" />}
              label="Location"
              value={opportunity.location}
            />
            <InfoRow
              icon={<Briefcase className="size-4" aria-hidden="true" />}
              label="Type"
              value={opportunity.type}
            />
            <InfoRow
              icon={<GraduationCap className="size-4" aria-hidden="true" />}
              label="Eligibility"
              value={opportunity.eligibility}
            />
            <InfoRow
              icon={<Users className="size-4" aria-hidden="true" />}
              label="Years / Branches"
              value={opportunity.yearsBranches}
            />
            {opportunity.stipend && (
              <InfoRow
                icon={<IndianRupee className="size-4" aria-hidden="true" />}
                label="Stipend"
                value={opportunity.stipend}
              />
            )}
            <InfoRow
              icon={<Calendar className="size-4" aria-hidden="true" />}
              label="Application Deadline"
              value={
                <span className={deadlinePassed ? "text-destructive" : undefined}>
                  {formatDate(opportunity.deadline)}
                  {deadlinePassed ? " (closed)" : ""}
                </span>
              }
            />
          </div>

          {opportunity.skills.length > 0 && (
            <div className="pt-6">
              <h2 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
                Skills
              </h2>
              <div className="flex flex-wrap gap-2 pt-2">
                {opportunity.skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="rounded-full">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6">
            <h2 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
              About this role
            </h2>
            <p className="pt-2 text-base leading-relaxed whitespace-pre-line text-foreground">
              {opportunity.description}
            </p>
          </div>

          <div className="pt-6">
            {hasRealUrl(opportunity.applyUrl) && !deadlinePassed ? (
              <ProtectedAction
                href={opportunity.applyUrl}
                label="Apply Now"
                lockedLabel="Login to Apply"
                onProceed={() => logEvent("opportunity", opportunity.id, "apply_click")}
              />
            ) : deadlinePassed ? (
              <p className="text-sm font-semibold text-muted-foreground">
                Applications for this opportunity have closed.
              </p>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">
                No application link has been added yet.
              </p>
            )}
          </div>
          <div className="pt-3">
            <EngagementToggle
              active={savedOpportunityIds.has(opportunity.id)}
              onToggle={() => toggleOpportunitySave(opportunity.id)}
              icon={Bookmark}
              label="Save to My Dashboard"
              activeLabel="Saved"
              redirectTo={`/opportunities/${opportunity.id}`}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Briefcase, Calendar, GraduationCap, IndianRupee, MapPin, Users, Star } from "lucide-react";

import { ProtectedAction } from "@/components/protected-action";
import { useContent } from "@/lib/content";
import { formatDate } from "@/lib/data";
import { usePageMeta } from "@/lib/seo";
import { logEvent } from "@/lib/analytics";
import { hasRealUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { accentSolid } from "@/components/bento";

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
  const { opportunities } = useContent();
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
      <div className="bento p-8">
        <h1 className="text-2xl font-extrabold">Opportunity not found</h1>
        <p className="pt-2 text-sm text-muted-foreground">
          This opportunity may have been removed or the link is incorrect.
        </p>
        <Link to="/opportunities" className="pt-3 inline-block text-sm font-bold underline">
          Back to opportunities
        </Link>
      </div>
    );
  }

  const deadlinePassed = new Date(opportunity.deadline + "T23:59:59") < new Date();

  return (
    <article className="bento overflow-hidden">
      <div className={`h-2 w-full ${accentSolid[opportunity.accent]}`} />
      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
            {opportunity.organization} · {opportunity.type}
          </p>
          {opportunity.featured && (
            <Badge variant="secondary" className="gap-1.5 bg-yellow/30 text-navy">
              <Star className="size-3.5 fill-current" aria-hidden="true" />
              Featured
            </Badge>
          )}
        </div>
        <h1 className="pt-2 text-3xl font-extrabold">{opportunity.title}</h1>
        <p className="pt-1 text-sm font-semibold text-muted-foreground">{opportunity.position}</p>

        <div className="mt-6 grid gap-5 rounded-2xl bg-muted/40 p-5 sm:grid-cols-2">
          <InfoRow icon={<MapPin className="size-4" aria-hidden="true" />} label="Location" value={opportunity.location} />
          <InfoRow icon={<Briefcase className="size-4" aria-hidden="true" />} label="Type" value={opportunity.type} />
          <InfoRow
            icon={<GraduationCap className="size-4" aria-hidden="true" />}
            label="Eligibility"
            value={opportunity.eligibility}
          />
          <InfoRow icon={<Users className="size-4" aria-hidden="true" />} label="Years / Branches" value={opportunity.yearsBranches} />
          {opportunity.stipend && (
            <InfoRow icon={<IndianRupee className="size-4" aria-hidden="true" />} label="Stipend" value={opportunity.stipend} />
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
            <h2 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">Skills</h2>
            <div className="flex flex-wrap gap-2 pt-2">
              {opportunity.skills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="pt-6">
          <h2 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">About this role</h2>
          <p className="pt-2 text-base leading-relaxed whitespace-pre-line">{opportunity.description}</p>
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
              No application link has been added for this opportunity yet.
            </p>
          )}
        </div>
        <Link to="/opportunities" className="mt-6 inline-block text-sm font-bold underline">
          Back to opportunities
        </Link>
      </div>
    </article>
  );
}

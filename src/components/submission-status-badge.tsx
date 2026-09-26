import type { NoticeStatus } from "@/lib/data";

const STYLES: Record<NoticeStatus, string> = {
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30",
  rejected: "bg-destructive/15 text-destructive border border-destructive/30",
};

/** Same look as NoticeStatusBadge, generalized for events/opportunities (any "pending" | "approved" | "rejected" status). */
export function SubmissionStatusBadge({ status }: { status: NoticeStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}

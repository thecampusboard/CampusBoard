import type { Notice } from "@/lib/data";

const STYLES: Record<Notice["status"], string> = {
  approved: "bg-green/20 text-navy",
  pending: "bg-yellow/30 text-navy",
  rejected: "bg-destructive/10 text-destructive",
};

export function NoticeStatusBadge({ status }: { status: Notice["status"] }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}

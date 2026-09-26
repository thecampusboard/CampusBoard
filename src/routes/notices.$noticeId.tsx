import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, ExternalLink, Paperclip } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DescriptionText } from "@/components/description-text";

import { useAuth } from "@/lib/auth";
import { useContent } from "@/lib/content";
import { formatDate } from "@/lib/data";
import { usePageMeta } from "@/lib/seo";
import { logEvent } from "@/lib/analytics";
import { getNoticeFileUrl } from "@/lib/notice-files";
import { hasRealUrl } from "@/lib/utils";

export default function NoticeDetail() {
  const { noticeId } = useParams<{ noticeId: string }>();
  const { notices, clubs } = useContent();
  const { user } = useAuth();
  const notice = notices.find((n) => n.id === noticeId);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    setFileUrl(null);
    if (!notice?.filePath) {
      setFileLoading(false);
      setFileError(null);
      return;
    }
    let active = true;
    setFileLoading(true);
    setFileError(null);
    getNoticeFileUrl(notice.filePath)
      .then((url) => {
        if (active) setFileUrl(url);
      })
      .catch(() => {
        if (active) setFileError("This attachment is temporarily unavailable.");
      })
      .finally(() => {
        if (active) setFileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [notice?.filePath]);

  usePageMeta(
    notice ? `${notice.title} — CampusBoard` : "Notice — CampusBoard",
    "Read the full campus notice details on CampusBoard.",
  );

  useEffect(() => {
    if (notice) logEvent("notice", notice.id, "view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice?.id]);

  const isOwner = !!notice && notice.createdBy === user?.id;
  const isAdmin = user?.role === "admin";
  // Everyone sees an approved notice; the student who submitted it can also
  // see it while it's pending/rejected, and so can Admin.
  const canView = notice && (notice.status === "approved" || isOwner || isAdmin);

  if (!notice || !canView) {
    return (
      <Card className="shadow-bento rounded-2xl border-border p-8">
        <h1 className="text-2xl font-bold text-foreground">Notice not found</h1>
        <p className="pt-2 text-sm text-muted-foreground">
          This notice may still be awaiting Admin approval, or is no longer available.
        </p>
        <Link
          to="/notices"
          className="pt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to notices
        </Link>
      </Card>
    );
  }

  const club = notice.clubId ? clubs.find((c) => c.id === notice.clubId) : undefined;

  return (
    <div className="mx-auto flex min-w-0 max-w-3xl flex-col gap-6">
      <Link
        to="/notices"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to notices
      </Link>
      <Card className="shadow-bento rounded-2xl border-border p-4 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-primary/10 text-primary flex justify-center items-center size-10 shrink-0">
            <Bell className="size-5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className="rounded-full bg-primary/10 text-primary text-[10px] capitalize"
            >
              {notice.category}
            </Badge>
            <span className="text-muted-foreground text-xs">{notice.department}</span>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight [overflow-wrap:anywhere]">
          {notice.title}
        </h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {formatDate(notice.date)}
        </p>
        {notice.status !== "approved" ? (
          <p
            className={
              "mt-2 text-xs font-bold " +
              (notice.status === "rejected" ? "text-destructive" : "text-amber-600")
            }
          >
            Status: {notice.status} — only visible to you and Admin.
            {notice.status === "rejected" && notice.rejectionReason
              ? ` Reason: ${notice.rejectionReason}`
              : ""}
          </p>
        ) : null}
        <DescriptionText text={notice.description} className="mt-5" />
        {notice.filePath ? (
          fileLoading ? (
            <p className="mt-4 text-sm font-semibold text-muted-foreground">
              Preparing attachment…
            </p>
          ) : fileUrl ? (
            notice.fileType === "Image" ? (
              <img
                src={fileUrl}
                alt={notice.fileLabel ?? "Attached image"}
                className="mt-5 max-h-96 w-full rounded-xl object-contain bg-muted"
              />
            ) : (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-accent transition-colors"
              >
                <Paperclip className="size-4 shrink-0" aria-hidden="true" />
                {notice.fileLabel ?? "Download attachment"}
              </a>
            )
          ) : fileError ? (
            <p role="alert" className="mt-4 text-sm font-semibold text-destructive">
              {fileError}
            </p>
          ) : null
        ) : null}
        {club ? (
          <Link
            to={`/clubs/${club.id}`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold hover:bg-accent transition-colors"
          >
            Related club: {club.name}
          </Link>
        ) : null}
        {hasRealUrl(notice.externalUrl) ? (
          <div className="mt-6">
            <a
              href={notice.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Open external link
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

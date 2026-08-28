import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ExternalLink, Paperclip } from "lucide-react";

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
      <div className="bento p-8">
        <h1 className="text-2xl font-extrabold">Notice not found</h1>
        <p className="pt-2 text-sm text-muted-foreground">
          This notice may still be awaiting Admin approval, or is no longer available.
        </p>
        <Link to="/notices" className="pt-3 inline-block text-sm font-bold underline">
          Back to notices
        </Link>
      </div>
    );
  }

  const club = notice.clubId ? clubs.find((c) => c.id === notice.clubId) : undefined;

  return (
    <article className="bento p-6 sm:p-8">
      <p className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
        {notice.category} · {notice.department}
      </p>
      <h1 className="pt-2 text-3xl font-extrabold">{notice.title}</h1>
      <p className="pt-1 text-sm font-semibold text-muted-foreground">{formatDate(notice.date)}</p>
      {notice.status !== "approved" ? (
        <p
          className={
            "pt-1 text-xs font-bold " +
            (notice.status === "rejected" ? "text-destructive" : "text-orange")
          }
        >
          Status: {notice.status} — only visible to you and Admin.
          {notice.status === "rejected" && notice.rejectionReason
            ? ` Reason: ${notice.rejectionReason}`
            : ""}
        </p>
      ) : null}
      <p className="pt-4 text-base leading-relaxed">{notice.description}</p>
      {notice.filePath ? (
        fileLoading ? (
          <p className="mt-4 text-sm font-semibold text-muted-foreground">Preparing attachment…</p>
        ) : fileUrl ? (
          notice.fileType === "Image" ? (
            <img
              src={fileUrl}
              alt={notice.fileLabel ?? "Attached image"}
              className="mt-4 max-h-96 w-full rounded-xl object-contain bg-muted"
            />
          ) : (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-accent"
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
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold hover:bg-accent"
        >
          Related club: {club.name}
        </Link>
      ) : null}
      <div className="mt-6 flex flex-col items-start gap-3">
        {hasRealUrl(notice.externalUrl) ? (
          <a
            href={notice.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-input px-4 text-sm font-bold hover:bg-accent"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Open external link
          </a>
        ) : null}
        <Link to="/notices" className="text-sm font-bold underline underline-offset-4">
          Back to notices
        </Link>
      </div>
    </article>
  );
}

import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  GraduationCap,
  History,
  Layers,
  Link2,
  Megaphone,
  UserRound,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { DescriptionText } from "@/components/description-text";
import { ExternalActionLink } from "@/components/external-action-link";
import { ImageGallery } from "@/components/image-gallery";
import { InterestButton } from "@/components/interest-button";
import { useContent } from "@/lib/content";
import { formatDate } from "@/lib/data";
import { isValidHttpUrl } from "@/lib/utils";
import { usePageMeta } from "@/lib/seo";
import { publicStorageUrl } from "@/lib/supabase";

export default function ChapterDetail() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const { chapters, loading } = useContent();
  const chapter = chapters.find((c) => c.id === chapterId);

  usePageMeta(
    chapter ? `${chapter.name} — CampusBoard` : "Chapter — CampusBoard",
    "Chapter profile, faculty mentor, chapter heads and how to get involved.",
  );

  if (!chapter) {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20" role="status">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading chapter…
          </div>
        </div>
      );
    }
    return (
      <Card className="shadow-bento rounded-2xl border-border p-8">
        <h1 className="text-2xl font-bold text-foreground">Chapter not found</h1>
        <p className="pt-2 text-sm text-muted-foreground">
          This chapter may have been removed or the link is incorrect.
        </p>
        <Link
          to="/chapters"
          className="pt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to chapters
        </Link>
      </Card>
    );
  }

  const socials = chapter.socials.filter((s) => isValidHttpUrl(s.url));

  return (
    <div className="mx-auto flex min-w-0 max-w-3xl flex-col gap-6">
      <Link
        to="/chapters"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to chapters
      </Link>
      <Card className="shadow-bento rounded-2xl border-border p-4 sm:p-8">
        {chapter.gallery.length > 0 ? (
          <ImageGallery
            images={chapter.gallery.map((path) => publicStorageUrl("content-images", path))}
            alt={`${chapter.name} gallery`}
            aspect="aspect-[16/9]"
            autoPlay
            className="mb-6"
          />
        ) : null}

        <div className="flex items-start gap-4">
          {chapter.imagePath ? (
            <img
              src={publicStorageUrl("content-images", chapter.imagePath)}
              alt=""
              className="size-14 shrink-0 rounded-2xl object-cover ring-1 ring-primary/10"
            />
          ) : (
            <span
              className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10"
              aria-hidden="true"
            >
              <Layers className="size-7" strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight [overflow-wrap:anywhere]">
              {chapter.name}
            </h1>
            <p className="pt-1 text-sm font-semibold text-muted-foreground [overflow-wrap:anywhere]">
              {chapter.tagline}
            </p>
          </div>
        </div>

        <p className="pt-4 text-xs font-semibold text-muted-foreground">
          A student-run chapter, regulated by its faculty mentor and chapter head(s).
        </p>

        <DescriptionText text={chapter.about} className="pt-3" />

        <div className="flex flex-wrap items-center gap-3 pt-4">
          <InterestButton kind="chapter" targetId={chapter.id} targetName={chapter.name} />
          <ExternalActionLink href={chapter.joinUrl} label="Join" variant="outline" />
        </div>

        <dl className="mt-5 grid gap-4 rounded-2xl bg-secondary/50 p-4 sm:grid-cols-2">
          {chapter.facultyMentor ? (
            <div className="flex min-w-0 items-start gap-3">
              <GraduationCap className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  Faculty mentor
                </dt>
                <dd className="text-sm font-semibold [overflow-wrap:anywhere]">
                  {chapter.facultyMentor}
                </dd>
              </div>
            </div>
          ) : null}
          {chapter.chapterHeads.length > 0 ? (
            <div className="flex min-w-0 items-start gap-3">
              <UserRound className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  {chapter.chapterHeads.length > 1 ? "Chapter heads" : "Chapter head"}
                </dt>
                <dd className="text-sm font-semibold [overflow-wrap:anywhere]">
                  {chapter.chapterHeads.join(", ")}
                </dd>
              </div>
            </div>
          ) : null}
          {chapter.members > 0 ? (
            <div className="flex min-w-0 items-start gap-3">
              <Users className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  Members
                </dt>
                <dd className="text-sm font-semibold">
                  {chapter.members}
                  {chapter.founded ? ` · Founded ${chapter.founded}` : ""}
                </dd>
              </div>
            </div>
          ) : null}
          {chapter.recruitment ? (
            <div className="min-w-0">
              <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Recruitment
              </dt>
              <dd className="text-sm font-semibold [overflow-wrap:anywhere]">
                {chapter.recruitment}
              </dd>
            </div>
          ) : null}
        </dl>

        {socials.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-4">
            {socials.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-bold transition-colors hover:bg-accent"
              >
                <Link2 className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{s.label}</span>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ))}
          </div>
        ) : null}

        {chapter.announcements.length > 0 ? (
          <section className="pt-6">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Megaphone className="size-4 shrink-0" aria-hidden="true" />
              Announcements
            </h2>
            <ul className="mt-2 space-y-2">
              {chapter.announcements.map((a, i) => (
                <li
                  key={i}
                  className="rounded-xl bg-secondary/50 p-3 text-sm leading-relaxed text-foreground whitespace-pre-line [overflow-wrap:anywhere]"
                >
                  {a}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {chapter.pastEvents.length > 0 ? (
          <section className="pt-6">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <History className="size-4 shrink-0" aria-hidden="true" />
              Past events
            </h2>
            <ul className="pt-2 space-y-1">
              {chapter.pastEvents.map((e, i) => (
                <li key={i} className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {e.title} — {formatDate(e.date)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Card>
    </div>
  );
}

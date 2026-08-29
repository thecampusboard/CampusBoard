import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2, Users, Pencil, ImagePlus } from "lucide-react";

import { useContent, slugify } from "@/lib/content";
import { ACCENTS } from "@/lib/data";
import { isValidHttpUrl } from "@/lib/utils";
import type { Club } from "@/lib/data";
import { publicStorageUrl, supabase } from "@/lib/supabase";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { BulkImportDialog } from "@/components/admin/bulk-import-dialog";
import { DraftBadge } from "@/components/admin/draft-badge";
import { Field, fieldClass, UrlField } from "@/components/admin/form-field";
import { uploadClubImage, uploadImages } from "@/components/admin/admin-storage";
import { ConfirmDeleteDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/bento";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ClubDraft = Club;

function emptyDraft(): ClubDraft {
  return {
    id: slugify("club"),
    name: "",
    tagline: "",
    about: "",
    accent: "navy",
    members: 0,
    founded: "",
    recruitment: "",
    announcements: [],
    gallery: [],
    socials: [],
    pastEvents: [],
  };
}

function ClubFormDialog({ club, trigger }: { club?: Club; trigger: React.ReactNode }) {
  const { addClub, updateClub } = useContent();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ClubDraft>(club ?? emptyDraft());
  const [announcementsText, setAnnouncementsText] = useState(
    (club?.announcements ?? []).join("\n"),
  );
  const [socials, setSocials] = useState<{ label: string; url: string }[]>(club?.socials ?? []);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!club;

  const set = <K extends keyof ClubDraft>(key: K, value: ClubDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }) as ClubDraft);

  const reset = () => {
    const base = club ?? emptyDraft();
    setDraft(base);
    setAnnouncementsText((club?.announcements ?? []).join("\n"));
    setSocials(club?.socials ?? []);
    setImageFile(null);
    setRemoveExistingImage(false);
    setGalleryFiles([]);
    setError(null);
  };

  const removeExistingGalleryPhoto = (path: string) => {
    if (submitting) return;
    setDraft((current) => ({
      ...current,
      gallery: current.gallery.filter((photo) => photo !== path),
    }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!draft.name.trim() || !draft.tagline.trim() || !draft.about.trim()) {
      setError("Name, tagline and about are required.");
      return;
    }
    for (const social of socials) {
      if (!social.label.trim() && !social.url.trim()) continue;
      if (!social.label.trim() || !isValidHttpUrl(social.url.trim())) {
        setError("Each social link needs a label and a valid http:// or https:// URL.");
        return;
      }
    }
    const cleanSocials = socials
      .filter((social) => social.label.trim() || social.url.trim())
      .map((social) => ({ label: social.label.trim(), url: social.url.trim() }));
    for (const f of [...(imageFile ? [imageFile] : []), ...galleryFiles]) {
      if (!new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]).has(f.type)) {
        setError("Photos must be JPEG, PNG, WebP or GIF images.");
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setError("Each photo must be 5 MB or smaller.");
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    const announcements = announcementsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const uploaded: string[] = [];
    try {
      let imagePath = draft.imagePath;
      if (imageFile) {
        imagePath = await uploadClubImage(draft.id, imageFile);
        uploaded.push(imagePath);
      }
      let gallery = draft.gallery;
      if (galleryFiles.length > 0) {
        const newPaths = await uploadImages(
          "content-images",
          `clubs/${draft.id}/gallery`,
          galleryFiles,
        );
        uploaded.push(...newPaths);
        gallery = [...gallery, ...newPaths];
      }
      const payload: ClubDraft = {
        ...draft,
        id: isEdit ? club.id : `${slugify(draft.name)}-${Date.now().toString(36)}`,
        announcements,
        socials: cleanSocials,
        gallery,
        ...(removeExistingImage ? { imagePath: "" } : imagePath ? { imagePath } : {}),
      };
      if (isEdit) {
        await updateClub(club.id, payload);
        const removedFromStorage = (club.gallery ?? []).filter((path) => !gallery.includes(path));
        if (removedFromStorage.length > 0) {
          await supabase.storage
            .from("content-images")
            .remove(removedFromStorage)
            .catch(() => {});
        }
        if (
          (removeExistingImage || (imageFile && club.imagePath && club.imagePath !== imagePath)) &&
          club.imagePath
        ) {
          await supabase.storage
            .from("content-images")
            .remove([club.imagePath])
            .catch(() => {});
        }
      } else {
        await addClub(payload);
      }
      setOpen(false);
    } catch (err) {
      if (uploaded.length > 0)
        supabase.storage
          .from("content-images")
          .remove(uploaded)
          .catch(() => {});
      setError(err instanceof Error ? err.message : "Couldn't save the club.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit club" : "Create club"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name" required>
            <input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              className={fieldClass}
              required
            />
          </Field>
          <Field label="Tagline" required>
            <input
              value={draft.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              className={fieldClass}
              required
            />
          </Field>
          <Field label="About" required>
            <textarea
              value={draft.about}
              onChange={(e) => set("about", e.target.value)}
              rows={3}
              className={fieldClass}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Members">
              <input
                type="number"
                min={0}
                value={draft.members}
                onChange={(e) => set("members", Number(e.target.value) || 0)}
                className={fieldClass}
              />
            </Field>
            <Field label="Founded" hint="Optional.">
              <input
                value={draft.founded}
                onChange={(e) => set("founded", e.target.value)}
                className={fieldClass}
                placeholder="2019"
              />
            </Field>
            <Field label="Accent color">
              <select
                value={draft.accent}
                onChange={(e) => set("accent", e.target.value as Club["accent"])}
                className={fieldClass}
              >
                {ACCENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Recruitment" hint="Optional — how/when students can join.">
            <input
              value={draft.recruitment}
              onChange={(e) => set("recruitment", e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Announcements" hint="One per line, most recent first.">
            <textarea
              value={announcementsText}
              onChange={(e) => setAnnouncementsText(e.target.value)}
              rows={3}
              className={fieldClass}
            />
          </Field>

          <div>
            <p className="text-xs font-bold text-foreground/80">Socials</p>
            <div className="mt-1 space-y-2">
              {socials.map((s, i) => (
                <div key={i} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={s.label}
                    onChange={(e) =>
                      setSocials((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                      )
                    }
                    placeholder="Instagram"
                    className={fieldClass + " mt-0 w-full sm:w-32 sm:shrink-0"}
                  />
                  <UrlField
                    value={s.url}
                    onChange={(e) =>
                      setSocials((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                      )
                    }
                    placeholder="https://instagram.com/…"
                    className="mt-0 min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setSocials((arr) => arr.filter((_, j) => j !== i))}
                    aria-label="Remove social link"
                    className="grid size-10 shrink-0 place-self-end place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10 sm:place-self-auto"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSocials((arr) => [...arr, { label: "", url: "" }])}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-xs font-bold hover:bg-accent"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add social link
              </button>
            </div>
          </div>

          {isEdit ? (
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-foreground/80">Existing gallery</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Remove photos you no longer want displayed. Changes are saved with this form.
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                  {draft.gallery.length} photo{draft.gallery.length === 1 ? "" : "s"}
                </span>
              </div>
              {draft.gallery.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {draft.gallery.map((path) => (
                    <div
                      key={path}
                      className="group relative overflow-hidden rounded-xl border border-border bg-secondary"
                    >
                      <img
                        src={publicStorageUrl("content-images", path)}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingGalleryPhoto(path)}
                        disabled={submitting}
                        aria-label="Remove gallery photo"
                        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full border border-white/20 bg-navy/90 text-white shadow-sm transition hover:bg-destructive disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary px-4 py-5 text-center text-xs text-muted-foreground">
                  No gallery photos remain. Add new ones below if needed.
                </div>
              )}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Club image" hint="Optional, up to 5 MB.">
              {isEdit && draft.imagePath && !removeExistingImage && !imageFile ? (
                <div className="mt-1 flex items-center gap-3 rounded-xl border border-border bg-secondary/60 p-2.5">
                  <img
                    src={publicStorageUrl("content-images", draft.imagePath)}
                    alt=""
                    className="size-12 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">Current image</p>
                    <p className="text-[11px] text-muted-foreground">Replace or remove it.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoveExistingImage(true)}
                    className="rounded-lg border border-destructive/25 px-2.5 py-2 text-xs font-bold text-destructive hover:bg-destructive/5"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              {!removeExistingImage ? (
                <label className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-accent">
                  <ImagePlus className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {imageFile?.name ?? (draft.imagePath ? "Replace image" : "Choose image")}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      setImageFile(e.target.files?.[0] ?? null);
                      setRemoveExistingImage(false);
                    }}
                  />
                </label>
              ) : (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                  <span className="text-xs font-semibold text-destructive">
                    Club image will be removed.
                  </span>
                  <button
                    type="button"
                    onClick={() => setRemoveExistingImage(false)}
                    className="text-xs font-bold underline"
                  >
                    Undo
                  </button>
                </div>
              )}
            </Field>
            <Field label="Gallery photos" hint="Optional, adds to the existing gallery.">
              <label className="mt-1 flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-card px-3 text-xs font-semibold text-muted-foreground hover:bg-accent">
                <ImagePlus className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {galleryFiles.length > 0 ? `${galleryFiles.length} selected` : "Choose photos"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => setGalleryFiles(Array.from(e.target.files ?? []))}
                />
              </label>
            </Field>
          </div>

          {error ? (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-10 items-center rounded-xl bg-navy px-5 text-sm font-bold text-navy-foreground transition-colors hover:bg-navy/90 disabled:opacity-60"
            >
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create club"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminClubsPage() {
  const { clubs, loading, error, refresh, remove } = useContent();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clubs
      .filter((c) => (q ? `${c.name} ${c.tagline}`.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clubs, search]);

  return (
    <div className="space-y-5">
      <div className="bento p-6">
        <h1 className="text-2xl font-extrabold">Clubs</h1>
        <p className="pt-1 text-sm text-muted-foreground">
          Manage club profiles, galleries and socials.
        </p>
      </div>

      <AdminToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search clubs…"
        count={filtered.length}
        noun="club"
        extra={
          <div className="flex shrink-0 flex-wrap gap-2 sm:ml-auto">
            <BulkImportDialog kind="clubs" onImported={refresh} />
            <ClubFormDialog
              trigger={
                <button
                  type="button"
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-navy px-4 text-sm font-bold text-navy-foreground transition hover:bg-navy/90 active:scale-[0.98]"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  New club
                </button>
              }
            />
          </div>
        }
      />

      {loading && clubs.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error && clubs.length === 0 ? (
        <ErrorState hint={error} onRetry={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={clubs.length === 0 ? "No clubs yet" : "No clubs match your search"}
          hint={clubs.length === 0 ? "Create the first club." : "Try a different search term."}
        />
      ) : (
        <ul className="bento divide-y divide-border p-2">
          {filtered.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
              {c.imagePath ? (
                <img
                  src={publicStorageUrl("content-images", c.imagePath)}
                  alt=""
                  className="size-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-lg bg-purple/25 text-navy"
                  aria-hidden="true"
                >
                  <Users className="size-4" strokeWidth={1.75} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.tagline} · {c.members} members
                </p>
              </div>
              {c.isDraft ? <DraftBadge /> : null}
              <div className="flex shrink-0 gap-1.5">
                <ClubFormDialog
                  club={c}
                  trigger={
                    <button
                      type="button"
                      aria-label={`Edit ${c.name}`}
                      className="grid size-9 place-items-center rounded-lg border border-border hover:bg-accent"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                  }
                />
                <ConfirmDeleteDialog
                  trigger={
                    <button
                      type="button"
                      aria-label={`Delete ${c.name}`}
                      className="grid size-9 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  }
                  title={`Delete "${c.name}"?`}
                  description="Events and notices linked to this club will be kept, just unlinked. This can't be undone."
                  onConfirm={() => remove("clubs", c.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

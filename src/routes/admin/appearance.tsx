import { useState } from "react";
import { ImagePlus, Image as ImageIcon, X, RefreshCw } from "lucide-react";

import { useContent } from "@/lib/content";
import { supabase, publicStorageUrl } from "@/lib/supabase";
import { uploadImages } from "@/components/admin/admin-storage";
import { usePageMeta } from "@/lib/seo";

import { Card } from "@/components/ui/card";

function validateImageFile(file: File): string | null {
  if (!new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]).has(file.type)) {
    return "Must be a JPEG, PNG, WebP or GIF image.";
  }
  if (file.size > 5 * 1024 * 1024) return "Must be 5 MB or smaller.";
  return null;
}

export default function AdminAppearancePage() {
  usePageMeta(
    "Appearance — Admin — CampusBoard",
    "Manage the homepage hero image and campus gallery.",
  );
  const { appearance, updateAppearance } = useContent();
  const [error, setError] = useState<string | null>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [heroImageBroken, setHeroImageBroken] = useState(false);

  const handleHeroImageUpload = async (file: File) => {
    const problem = validateImageFile(file);
    if (problem) {
      setError(`Hero image: ${problem}`);
      return;
    }
    setError(null);
    setHeroUploading(true);
    const previousPath = appearance.heroImagePath;
    let uploadedPath: string | null = null;
    try {
      const [path] = await uploadImages("content-images", "site/hero", [file]);
      if (!path) throw new Error("Upload succeeded but returned no file path.");
      uploadedPath = path;
      await updateAppearance({ heroImagePath: path });
      setHeroImageBroken(false);
      if (previousPath && previousPath !== path) {
        await supabase.storage
          .from("content-images")
          .remove([previousPath])
          .catch(() => {});
      }
    } catch (err) {
      if (uploadedPath)
        await supabase.storage
          .from("content-images")
          .remove([uploadedPath])
          .catch(() => {});
      setError(err instanceof Error ? err.message : "Could not upload the hero image.");
    } finally {
      setHeroUploading(false);
    }
  };

  const handleHeroImageRemove = async () => {
    setError(null);
    const previousPath = appearance.heroImagePath;
    try {
      await updateAppearance({ heroImagePath: null });
      setHeroImageBroken(false);
      if (previousPath)
        await supabase.storage
          .from("content-images")
          .remove([previousPath])
          .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the hero image.");
    }
  };

  const handleGalleryAdd = async (files: File[]) => {
    for (const f of files) {
      const problem = validateImageFile(f);
      if (problem) {
        setError(`Campus gallery: ${problem}`);
        return;
      }
    }
    setError(null);
    setGalleryUploading(true);
    try {
      const paths = await uploadImages("content-images", "site/campus-gallery", files);
      await updateAppearance({ campusGalleryPaths: [...appearance.campusGalleryPaths, ...paths] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload gallery photos.");
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleGalleryRemove = async (path: string) => {
    setError(null);
    try {
      await updateAppearance({
        campusGalleryPaths: appearance.campusGalleryPaths.filter((p) => p !== path),
      });
      await supabase.storage
        .from("content-images")
        .remove([path])
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the photo.");
    }
  };

  const heroUrl = appearance.heroImagePath
    ? publicStorageUrl("content-images", appearance.heroImagePath)
    : null;

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-foreground">
          Appearance
        </h1>
        <p className="max-w-2xl pt-2 text-sm leading-relaxed text-muted-foreground">
          Customize the homepage hero banner image and campus showcase gallery.
        </p>
      </Card>

      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm font-semibold text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-foreground">Hero background image</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Recommended: high-resolution landscape photo with balanced contrast.
                </p>
              </div>
              {heroUrl && heroImageBroken ? (
                <button
                  type="button"
                  onClick={() => setHeroImageBroken(false)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground hover:bg-accent"
                  aria-label="Retry loading hero image"
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  Retry
                </button>
              ) : null}
            </div>

            {heroUrl && !heroImageBroken ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-muted shadow-inner">
                <img
                  src={heroUrl}
                  alt="Current homepage hero background"
                  className="aspect-[16/8] w-full object-cover"
                  onError={() => setHeroImageBroken(true)}
                />
              </div>
            ) : (
              <div className="mt-4 grid aspect-[16/8] place-items-center rounded-2xl border border-dashed border-border bg-secondary/40 px-6 text-center">
                <div>
                  <ImageIcon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-2 text-sm font-semibold">Using the default hero illustration</p>
                  {heroUrl ? (
                    <p className="mt-1 text-xs text-destructive">
                      The uploaded image could not be loaded.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Upload an image to replace it.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
                <ImagePlus className="size-4" aria-hidden="true" />
                <span>{heroUploading ? "Uploading…" : "Upload / replace hero"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={heroUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void handleHeroImageUpload(file);
                  }}
                />
              </label>
              {appearance.heroImagePath ? (
                <button
                  type="button"
                  onClick={handleHeroImageRemove}
                  disabled={heroUploading}
                  className="inline-flex min-h-10 items-center rounded-lg border border-destructive/25 px-4 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60"
                >
                  Remove image
                </button>
              ) : null}
            </div>
          </div>

          <div className="min-w-0">
            <div>
              <p className="text-sm font-bold text-foreground">
                Campus gallery{" "}
                <span className="font-normal text-muted-foreground">
                  ({appearance.campusGalleryPaths.length})
                </span>
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Images appear in the homepage campus section gallery showcase.
              </p>
            </div>

            {appearance.campusGalleryPaths.length > 0 ? (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {appearance.campusGalleryPaths.map((path) => (
                  <li
                    key={path}
                    className="group relative overflow-hidden rounded-xl border border-border bg-muted"
                  >
                    <img
                      src={publicStorageUrl("content-images", path)}
                      alt=""
                      className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                    <button
                      type="button"
                      onClick={() => void handleGalleryRemove(path)}
                      aria-label="Remove photo"
                      className="absolute right-2 top-2 grid size-7 place-items-center rounded-full border border-white/20 bg-background/80 backdrop-blur-sm text-foreground shadow-sm transition hover:bg-destructive hover:text-white"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 grid min-h-44 place-items-center rounded-2xl border border-dashed border-border bg-secondary/40 px-6 text-center">
                <div>
                  <ImageIcon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-2 text-sm font-semibold">No campus photos yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The homepage will display default campus illustrations.
                  </p>
                </div>
              </div>
            )}

            <label className="mt-4 flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card px-4 text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
              <ImagePlus className="size-4" aria-hidden="true" />
              <span>{galleryUploading ? "Uploading…" : "Add campus photos"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                disabled={galleryUploading}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (files.length > 0) void handleGalleryAdd(files);
                }}
              />
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
}

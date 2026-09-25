import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

/** Uploads a batch of images under a shared prefix, returning their storage paths. Stops and throws on the first failure — callers decide whether to roll back what already succeeded. */
export async function uploadImages(
  bucket: string,
  prefix: string,
  files: File[],
): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "image";
    const path = `${prefix}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) {
      if (paths.length > 0)
        await supabase.storage
          .from(bucket)
          .remove(paths)
          .catch(() => {});
      throw error;
    }
    paths.push(path);
  }
  return paths;
}

/** Uploads under clubs/{clubId}/... so storage RLS (Admin-only write) applies; content-images is a public bucket. */
export async function uploadClubImage(clubId: string, file: File) {
  const path = `clubs/${clubId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("content-images").upload(path, file, {
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Payment screenshots live in a private bucket — fetch a short-lived signed URL to display one. */
export function PaymentScreenshot({ path, title }: { path: string; title: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.storage
      .from("payment-screenshots")
      .createSignedUrl(path, 300)
      .then(({ data }) => {
        if (active && data) setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (!url) {
    return (
      <div className="grid h-28 w-28 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-xs text-muted-foreground">
        Loading…
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer noopener">
      <img
        src={url}
        alt={`Payment screenshot for ${title}`}
        className="h-28 w-28 shrink-0 rounded-lg border border-border object-cover"
      />
    </a>
  );
}

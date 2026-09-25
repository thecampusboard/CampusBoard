import { supabase } from "@/lib/supabase";
import type { Notice } from "@/lib/data";

/** Path convention required by the notice_files_owner_write RLS policy: the first path segment must be the caller's own uid — true for a student submitting their own notice and for Admin authoring one directly. */
export async function uploadNoticeFile(userId: string, noticeId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "attachment";
  const path = `${userId}/${noticeId}-${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("notice-files").upload(path, file, {
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function noticeFileTypeFor(file: File): Notice["fileType"] {
  if (file.type === "application/pdf") return "PDF";
  if (file.type.startsWith("image/")) return "Image";
  return "Text";
}

export async function getNoticeFileUrl(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from("notice-files")
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

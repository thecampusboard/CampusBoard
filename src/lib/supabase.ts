import { createClient } from "@supabase/supabase-js";

/**
 * Single Supabase client for the whole app. Uses the anon key only — every
 * permission is enforced by the RLS policies in supabase/migrations/, never
 * by trusting the client. Never import the service-role key here.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fails loudly in dev rather than silently hitting undefined endpoints.
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project's values.",
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");

/**
 * Public URL for an object in a PUBLIC storage bucket (content-images,
 * listing-images). Never use this for the payment-screenshots bucket — that
 * one is private by design; fetch a signed URL for it instead (see
 * lib/content.tsx's Admin payment-screenshot review flow).
 */
export function publicStorageUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

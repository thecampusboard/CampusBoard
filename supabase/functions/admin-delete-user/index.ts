// CampusBoard — admin-delete-user Edge Function (Deno).
//
// Deleting an auth user needs the Supabase Auth Admin API, which needs the
// service-role key. That key lives ONLY here, in the function's server-side
// environment (SUPABASE_SERVICE_ROLE_KEY is injected automatically by
// Supabase) — it is never sent to, or bundled into, the browser app.
//
// Authorization is checked here, on the server, on every call:
//   1. The request must carry a valid user JWT (also enforced by the
//      gateway's verify_jwt default).
//   2. That user's profile must have role = 'admin'.
//   3. An admin can never delete their own account.
// A database trigger (020_admin_user_removal.sql) additionally refuses to
// remove the last remaining Admin.
//
// Deploy:  supabase functions deploy admin-delete-user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Server is not configured." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Not signed in." }, 401);

  // 1. Who is calling? Resolve the caller from THEIR token, never from the body.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) return json({ error: "Not signed in." }, 401);
  const callerId = callerData.user.id;

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 2. Are they an Admin? (Role is read server-side from public.profiles.)
  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .maybeSingle();
  if (profileError) return json({ error: "Could not verify permissions." }, 500);
  if (callerProfile?.role !== "admin") return json({ error: "Admin access required." }, 403);

  // 3. Validate the target.
  let userId: unknown;
  try {
    ({ userId } = await req.json());
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (typeof userId !== "string" || !UUID_RE.test(userId)) {
    return json({ error: "A valid userId is required." }, 400);
  }
  if (userId === callerId) {
    return json({ error: "You cannot remove your own account." }, 400);
  }

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (targetError) return json({ error: "Could not look up that user." }, 500);
  if (!target) return json({ error: "User not found." }, 404);

  // Best-effort storage cleanup for files the user owns and that would
  // otherwise be orphaned (their listing rows cascade-delete with them).
  // Payment screenshots are private, so they are worth removing explicitly.
  try {
    const { data: listings } = await admin
      .from("buy_sell_listings")
      .select("images, payment_screenshot_path")
      .eq("owner_id", userId);
    const screenshots: string[] = [];
    const images: string[] = [];
    for (const l of listings ?? []) {
      if (l.payment_screenshot_path) screenshots.push(l.payment_screenshot_path);
      if (Array.isArray(l.images)) images.push(...l.images);
    }
    if (screenshots.length > 0) await admin.storage.from("payment-screenshots").remove(screenshots);
    if (images.length > 0) await admin.storage.from("listing-images").remove(images);
  } catch (err) {
    console.error("storage cleanup failed", err);
  }

  // 4. Delete the auth user. public.profiles and everything user-owned
  //    follows via the foreign keys documented in 020_admin_user_removal.sql.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("deleteUser failed", deleteError);
    const lastAdmin = /last remaining admin/i.test(deleteError.message);
    return json(
      {
        error: lastAdmin
          ? "The last remaining Admin cannot be removed."
          : "Could not remove that user.",
      },
      lastAdmin ? 409 : 500,
    );
  }

  return json({ ok: true });
});

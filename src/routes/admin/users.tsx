import { useEffect, useMemo, useState } from "react";
import { Trash2, UserCog } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/data";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { ConfirmDeleteDialog } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/bento";
import { Badge } from "@/components/ui/badge";

import { Card } from "@/components/ui/card";

interface AdminProfileRow {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  createdAt: string;
}

/**
 * Removes a user through the `admin-delete-user` Edge Function
 * (supabase/functions/admin-delete-user). Deleting an auth user needs the
 * service-role key, which only ever exists inside that function — the
 * browser just sends the caller's own session token, and the function
 * re-verifies on the server that the caller is an Admin.
 */
async function deleteUserAccount(userId: string): Promise<void> {
  const { error: fnError } = await supabase.functions.invoke("admin-delete-user", {
    body: { userId },
  });
  if (!fnError) return;
  let message = "Couldn't remove that user. Please try again.";
  const context = (fnError as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const body = (await context.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* keep the generic message */
    }
  }
  throw new Error(message);
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("profiles")
      .select("id, name, email, role, created_at")
      .order("created_at", { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      setUsers(
        (data ?? []).map((r) => {
          const row = r as {
            id: string;
            name: string;
            email: string;
            role: string;
            created_at: string;
          };
          return {
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role === "admin" ? "admin" : "student",
            createdAt: row.created_at,
          };
        }),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q));
  }, [users, search]);

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-8 border-border/70 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-foreground">
          Users
        </h1>
        <p className="pt-2 text-sm text-muted-foreground">
          Everyone who has registered on CampusBoard. Role privileges are managed securely in
          Supabase. Removing a user is permanent.
        </p>
      </Card>

      <AdminToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by name or email…"
        count={filtered.length}
        noun="user"
      />

      {loading && users.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error && users.length === 0 ? (
        <ErrorState hint={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={users.length === 0 ? "No users yet" : "No users match your search"}
          hint={
            users.length === 0
              ? "Registered users will show up here."
              : "Try a different search term."
          }
        />
      ) : (
        <Card role="list" className="divide-y divide-border/60 p-2 border-border/70 shadow-sm">
          {filtered.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-3 list-none">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
                aria-hidden="true"
              >
                <UserCog className="size-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate text-sm font-bold text-foreground">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant={u.role === "admin" ? "default" : "secondary"} className="capitalize">
                {u.role}
              </Badge>
              <span className="text-xs font-semibold text-muted-foreground">
                Joined {formatDate(u.createdAt)}
              </span>
              <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground/60 xl:inline">
                {u.id}
              </span>
              {u.id === currentUser?.id ? (
                <span className="shrink-0 rounded-lg border border-border px-2.5 py-2 text-xs font-bold text-muted-foreground">
                  This is you
                </span>
              ) : (
                <ConfirmDeleteDialog
                  trigger={
                    <button
                      type="button"
                      aria-label={`Remove user ${u.name}`}
                      className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  }
                  title={`Remove ${u.name}?`}
                  confirmLabel="Remove user"
                  description={
                    <div className="space-y-2 text-left">
                      <p>
                        This permanently deletes <strong>{u.email}</strong>&apos;s account and signs
                        them out. It is destructive and can&apos;t be undone.
                      </p>
                      <ul className="list-disc space-y-1 pl-5">
                        <li>Their Buy &amp; Sell listings and interest submissions are deleted.</li>
                        <li>
                          Notices, events and opportunities they submitted stay on CampusBoard but
                          lose their author.
                        </li>
                      </ul>
                    </div>
                  }
                  onConfirm={async () => {
                    await deleteUserAccount(u.id);
                    setUsers((current) => current.filter((x) => x.id !== u.id));
                  }}
                />
              )}
            </li>
          ))}
        </Card>
      )}
    </div>
  );
}

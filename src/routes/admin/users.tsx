import { useEffect, useMemo, useState } from "react";
import { UserCog } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/data";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { EmptyState, ErrorState, CardSkeleton } from "@/components/bento";
import { Badge } from "@/components/ui/badge";

interface AdminProfileRow {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  createdAt: string;
}

/**
 * Read-only: every registered CampusBoard user, for Admin to browse/search.
 *
 * No new backend work was needed for this — `profiles` already has
 * name/email/role/created_at (001_initial_schema.sql), and the existing
 * `profiles_select_own` RLS policy ("id = auth.uid() OR is_admin()") already
 * lets an Admin session select every row directly from the client. No
 * service-role key or server-side function is used or required, and only
 * non-sensitive columns are selected — no password, token, or other auth
 * secret is ever queried.
 *
 * Role changes aren't exposed here: 011_production_hardening.sql
 * deliberately removed the ability to update *any* profile (including an
 * Admin updating someone else's) from the client, so this page doesn't add
 * a control the database wouldn't accept anyway. Promoting/demoting a role
 * still has to be done directly in Supabase, exactly as before this feature.
 */
export default function AdminUsersPage() {
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
    <div className="space-y-5">
      <div className="bento p-6">
        <h1 className="text-2xl font-extrabold">Users</h1>
        <p className="pt-1 text-sm text-muted-foreground">
          Everyone who has signed up on CampusBoard. Roles are still changed directly in Supabase,
          not here.
        </p>
      </div>

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
        <ul className="bento divide-y divide-border p-2">
          {filtered.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-purple/25 text-navy"
                aria-hidden="true"
              >
                <UserCog className="size-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant={u.role === "admin" ? "default" : "secondary"} className="capitalize">
                {u.role}
              </Badge>
              <span className="text-xs font-semibold text-muted-foreground">
                Joined {formatDate(u.createdAt)}
              </span>
              <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground/70 sm:inline">
                {u.id}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

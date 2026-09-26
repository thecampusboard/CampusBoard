import { useEffect, useMemo, useState } from "react";
import { UserCog } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/data";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
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
    <div className="space-y-6">
      <Card className="p-6 sm:p-8 border-border/70 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-foreground">Users</h1>
        <p className="pt-2 text-sm text-muted-foreground">
          Everyone who has registered on CampusBoard. Role privileges are managed securely in Supabase.
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
        <Card className="divide-y divide-border/60 p-2 border-border/70 shadow-sm">
          {filtered.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-3 list-none">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
                aria-hidden="true"
              >
                <UserCog className="size-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant={u.role === "admin" ? "default" : "secondary"} className="capitalize">
                {u.role}
              </Badge>
              <span className="text-xs font-semibold text-muted-foreground">
                Joined {formatDate(u.createdAt)}
              </span>
              <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground/60 sm:inline">
                {u.id}
              </span>
            </li>
          ))}
        </Card>
      )}
    </div>
  );
}

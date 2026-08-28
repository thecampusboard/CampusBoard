import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarHeart } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useContent, type CollegeHoliday } from "@/lib/content";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function safeHolidayId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `holiday-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function HolidayCalendar() {
  const { appearance, updateAppearance } = useContent();
  const { user } = useAuth();
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const holidays = useMemo(
    () =>
      [...appearance.holidays].sort(
        (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name),
      ),
    [appearance.holidays],
  );

  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, CollegeHoliday[]>();
    for (const holiday of holidays) {
      const existing = map.get(holiday.date) ?? [];
      existing.push(holiday);
      map.set(holiday.date, existing);
    }
    return map;
  }, [holidays]);

  const selectedHolidays = selectedDate ? (holidaysByDate.get(selectedDate) ?? []) : [];
  const monthHolidays = holidays.filter((holiday) => {
    const d = new Date(`${holiday.date}T00:00:00`);
    return isSameMonth(d, month);
  });

  const openManage = (initialDate?: string) => {
    setError(null);
    setName("");
    setDescription("");
    setDate(
      initialDate ??
        format(selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date(), "yyyy-MM-dd"),
    );
    setManageOpen(true);
  };

  const addHoliday = async () => {
    const cleanName = name.trim();
    if (!cleanName || !date) {
      setError("Holiday name and date are required.");
      return;
    }
    if (
      holidays.some(
        (holiday) =>
          holiday.date === date && holiday.name.toLowerCase() === cleanName.toLowerCase(),
      )
    ) {
      setError("That holiday is already listed.");
      return;
    }
    setSaving(true);
    setError(null);
    const holiday: CollegeHoliday = {
      id: safeHolidayId(),
      date,
      name: cleanName,
      ...(description.trim() ? { description: description.trim() } : {}),
    };
    try {
      await updateAppearance({ holidays: [...appearance.holidays, holiday] });
      setManageOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the holiday.");
    } finally {
      setSaving(false);
    }
  };

  const removeHoliday = async (id: string) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateAppearance({
        holidays: appearance.holidays.filter((holiday) => holiday.id !== id),
      });
      if (selectedDate && (holidaysByDate.get(selectedDate) ?? []).length === 1)
        setSelectedDate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the holiday.");
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-5">
      <section className="bento overflow-hidden p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
              College holidays
            </p>
            <h2 className="pt-1 text-2xl font-extrabold tracking-tight">Holiday calendar</h2>
            <p className="pt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              College-declared holidays in a simple month view. Select a date to see the holiday
              details.
            </p>
          </div>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => openManage()}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-navy px-3.5 text-sm font-bold text-navy-foreground transition hover:bg-navy/90 active:scale-[0.98]"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add holiday
            </button>
          ) : null}
        </div>
      </section>

      <section className="bento overflow-hidden p-3 sm:p-5">
        <div className="flex items-center justify-between gap-3 px-1 pb-4 sm:px-2">
          <button
            type="button"
            onClick={() => setMonth((current) => subMonths(current, 1))}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <div className="text-center">
            <h3 className="text-base font-extrabold sm:text-lg">{format(month, "MMMM yyyy")}</h3>
            <p className="text-xs text-muted-foreground">
              {monthHolidays.length} holiday{monthHolidays.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMonth((current) => addMonths(current, 1))}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
            aria-label="Next month"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-border bg-card">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div
              key={day}
              className="border-b border-border bg-secondary px-1 py-2 text-center text-[10px] font-bold text-muted-foreground uppercase sm:text-xs"
            >
              {day}
            </div>
          ))}
          {monthDays.map((day, index) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayHolidays = holidaysByDate.get(dateKey) ?? [];
            const inMonth = isSameMonth(day, month);
            const selected = selectedDate
              ? isSameDay(day, new Date(`${selectedDate}T00:00:00`))
              : false;
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                className={`min-h-20 border-b border-border p-1.5 text-left transition hover:bg-accent/60 sm:min-h-24 sm:p-2 ${
                  index % 7 !== 6 ? "border-r" : ""
                } ${!inMonth ? "bg-muted/35 text-muted-foreground" : "bg-card"} ${selected ? "ring-2 ring-inset ring-sky" : ""}`}
                aria-label={`${format(day, "d MMMM yyyy")}${dayHolidays.length ? `, ${dayHolidays.map((h) => h.name).join(", ")}` : ""}`}
              >
                <span
                  className={`inline-grid size-7 place-items-center rounded-full text-xs font-bold ${selected ? "bg-navy text-navy-foreground" : ""}`}
                >
                  {format(day, "d")}
                </span>
                <span className="mt-1 block space-y-1">
                  {dayHolidays.slice(0, 2).map((holiday) => (
                    <span
                      key={holiday.id}
                      className="block truncate rounded-md bg-purple/20 px-1.5 py-1 text-[10px] font-bold leading-tight text-foreground"
                    >
                      {holiday.name}
                    </span>
                  ))}
                  {dayHolidays.length > 2 ? (
                    <span className="block px-1.5 text-[10px] font-bold text-muted-foreground">
                      +{dayHolidays.length - 2} more
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        {selectedDate ? (
          <div className="mt-4 rounded-xl border border-border bg-secondary p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
                  Selected date
                </p>
                <p className="pt-1 text-sm font-extrabold">
                  {format(new Date(`${selectedDate}T00:00:00`), "EEEE, d MMMM yyyy")}
                </p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => openManage(selectedDate)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-bold hover:bg-accent"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add
                </button>
              ) : null}
            </div>
            {selectedHolidays.length > 0 ? (
              <div className="mt-3 space-y-2">
                {selectedHolidays.map((holiday) => (
                  <div key={holiday.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{holiday.name}</p>
                        {holiday.description ? (
                          <p className="pt-1 text-xs leading-5 text-muted-foreground">
                            {holiday.description}
                          </p>
                        ) : null}
                      </div>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => void removeHoliday(holiday.id)}
                          disabled={saving}
                          aria-label={`Remove ${holiday.name}`}
                          className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/5 disabled:opacity-50"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
                No holiday is published for this date.
                {isAdmin ? " Add one with the button above." : ""}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="bento p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <CalendarHeart className="size-5 text-purple" aria-hidden="true" />
          <h3 className="text-base font-extrabold">Holidays this month</h3>
        </div>
        {monthHolidays.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {monthHolidays.map((holiday) => (
              <button
                key={holiday.id}
                type="button"
                onClick={() => setSelectedDate(holiday.date)}
                className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:bg-accent"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-purple/15 text-center">
                  <span className="text-[10px] font-bold uppercase">
                    {format(new Date(`${holiday.date}T00:00:00`), "MMM")}
                  </span>
                  <span className="text-base font-extrabold leading-none">
                    {format(new Date(`${holiday.date}T00:00:00`), "d")}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{holiday.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {holiday.description || format(new Date(`${holiday.date}T00:00:00`), "EEEE")}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary px-5 py-8 text-center">
            <p className="text-sm font-semibold">
              No holidays published for {format(month, "MMMM yyyy")}.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isAdmin
                ? "Use Add holiday to publish the college holiday calendar."
                : "Check another month or check back for updates."}
            </p>
          </div>
        )}
      </section>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-md overflow-y-auto sm:max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add college holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <label className="block text-sm font-semibold">
              Holiday name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 block h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none transition focus:ring-2 focus:ring-sky"
                placeholder="Independence Day"
                autoFocus
              />
            </label>
            <label className="block text-sm font-semibold">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 block h-11 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none transition focus:ring-2 focus:ring-sky"
              />
            </label>
            <label className="block text-sm font-semibold">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1.5 block w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-sky"
                placeholder="College remains closed."
              />
            </label>
            {error ? (
              <p
                role="alert"
                className="rounded-lg bg-destructive/5 px-3 py-2 text-sm font-semibold text-destructive"
              >
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setManageOpen(false)}
              className="min-h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void addHoliday()}
              disabled={saving}
              className="min-h-10 rounded-xl bg-navy px-4 text-sm font-bold text-navy-foreground hover:bg-navy/90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Add holiday"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

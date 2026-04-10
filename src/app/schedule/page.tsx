"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import ScheduleSheet from "@/components/ScheduleSheet";
import { useJobsByDateRange } from "@/hooks/useJobs";
import { db } from "@/lib/db";
import { formatServiceType } from "@/lib/format";
import type { Job } from "@/lib/types";

// ── Date helpers ──────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function formatDayHeading(d: Date): string {
  const today = new Date();
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, addDays(today, 1))) return "Tomorrow";
  if (isSameDay(d, addDays(today, -1))) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatShortDay(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatJobTime(isoString: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeDate(isoString: string): string {
  const d = new Date(isoString);
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ── Customer name lookup component ─────────────────────────────────────────────

function CustomerName({ customerId }: { customerId: string }) {
  const customer = useLiveQuery(
    () => db.customers.get(customerId),
    [customerId]
  );
  return <>{customer?.name ?? "…"}</>;
}

// ── Job Card (Day View) ────────────────────────────────────────────────────────

function DayJobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-4 py-3.5 active:bg-white/[0.04] transition-colors min-h-[64px]"
    >
      <div className="flex-shrink-0 w-14 pt-0.5">
        <span className="text-white/50 text-[12px] font-medium">
          {job.scheduledDate ? formatJobTime(job.scheduledDate) : "—"}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white text-[14px] font-semibold truncate">
            <CustomerName customerId={job.customerId} />
          </span>
          <StatusBadge status={job.status} />
        </div>
        <span className="text-white/50 text-[12px] block truncate">
          {formatServiceType(job.serviceType)}
        </span>
        {job.address ? (
          <span className="text-white/35 text-[12px] block truncate mt-0.5">
            {job.address}
          </span>
        ) : null}
      </div>
      <svg
        width="7"
        height="12"
        viewBox="0 0 7 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-white/30 flex-shrink-0 mt-1"
        aria-hidden="true"
      >
        <path
          d="M1 1L6 6L1 11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// ── Main Schedule Page ─────────────────────────────────────────────────────────

type ViewMode = "upcoming" | "day" | "week" | "month";

export default function SchedulePage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("upcoming");
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);

  // Day view date range
  const dayStart = startOfDay(selectedDate).toISOString();
  const dayEnd = endOfDay(selectedDate).toISOString();

  // Week view date range
  const weekStart = getMondayOfWeek(selectedDate);
  const weekEnd = addDays(weekStart, 7);

  // Month view date range
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  // For day view, fetch jobs for the selected day
  const dayJobs = useJobsByDateRange(dayStart, dayEnd);

  // For week view, fetch jobs for the whole week
  const weekJobs = useJobsByDateRange(weekStart.toISOString(), weekEnd.toISOString());

  // For month view, fetch jobs for the whole month
  const monthJobs = useJobsByDateRange(monthStart.toISOString(), monthEnd.toISOString());

  // For upcoming view, fetch all future jobs from today onward
  const upcomingJobs = useLiveQuery(async () => {
    const nowIso = startOfDay(new Date()).toISOString();
    const jobs = await db.jobs
      .where("scheduledDate")
      .above(nowIso)
      .toArray();
    // Also include today's jobs
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();
    const todayJobs = await db.jobs
      .where("scheduledDate")
      .between(todayStart, todayEnd, true, false)
      .toArray();
    const all = [...todayJobs, ...jobs];
    // Deduplicate by id
    const seen = new Set<string>();
    const unique = all.filter((j) => {
      if (seen.has(j.id)) return false;
      seen.add(j.id);
      return true;
    });
    return unique.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, []);

  const today = startOfDay(new Date());

  function goBack() {
    if (viewMode === "day") {
      setSelectedDate((d) => addDays(d, -1));
    } else if (viewMode === "week") {
      setSelectedDate((d) => addDays(d, -7));
    } else if (viewMode === "month") {
      setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    }
  }

  function goForward() {
    if (viewMode === "day") {
      setSelectedDate((d) => addDays(d, 1));
    } else if (viewMode === "week") {
      setSelectedDate((d) => addDays(d, 7));
    } else if (viewMode === "month") {
      setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    }
  }

  function goToday() {
    setSelectedDate(today);
  }

  const isToday = isSameDay(selectedDate, today);
  const showNav = viewMode !== "upcoming";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppShell showBack title="Schedule">
      <div className="flex flex-col flex-1">

        {/* Controls bar */}
        <div className="px-4 pt-3 pb-3 flex flex-col gap-3 border-b border-white/[0.06]">
          {/* View mode toggle */}
          <div className="flex rounded-xl bg-white/[0.06] border border-white/[0.08] p-1 gap-1">
            {(["upcoming", "day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode);
                  if (mode !== "upcoming") setSelectedDate(today);
                }}
                className={[
                  "flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all",
                  viewMode === mode
                    ? "bg-white/[0.12] text-white shadow-sm"
                    : "text-white/40 active:text-white/70",
                ].join(" ")}
              >
                {mode === "upcoming" ? "Upcoming" : mode === "day" ? "Day" : mode === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>

          {/* Navigation — hidden for upcoming view */}
          {showNav && (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={goBack}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08] active:bg-white/15 transition-colors text-white"
                aria-label="Previous"
              >
                <svg width="9" height="15" viewBox="0 0 9 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M7.5 1.5L1.5 7.5L7.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className="flex-1 text-center">
                {viewMode === "day" && (
                  <p className="text-white font-semibold text-[15px]">
                    {formatDayHeading(selectedDate)}
                  </p>
                )}
                {viewMode === "week" && (
                  <p className="text-white font-semibold text-[15px]">
                    {formatShortDate(weekStart)} – {formatShortDate(addDays(weekStart, 6))}
                  </p>
                )}
                {viewMode === "month" && (
                  <p className="text-white font-semibold text-[15px]">
                    {formatMonthYear(selectedDate)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {!isToday && (
                  <button
                    onClick={goToday}
                    className="px-3 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] text-blue-400 text-[13px] font-medium active:bg-white/15 transition-colors"
                  >
                    Today
                  </button>
                )}
                <button
                  onClick={goForward}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08] active:bg-white/15 transition-colors text-white"
                  aria-label="Next"
                >
                  <svg width="9" height="15" viewBox="0 0 9 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M1.5 1.5L7.5 7.5L1.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-28">

          {/* ── Upcoming View ─────────────────────────────────────────────── */}
          {viewMode === "upcoming" && (
            <div className="mx-4 mt-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
              {(!upcomingJobs || upcomingJobs.length === 0) ? (
                <div className="px-4 py-12 flex flex-col items-center gap-2">
                  <p className="text-white/30 text-[15px] font-medium">No upcoming jobs</p>
                  <p className="text-white/20 text-[13px]">Schedule a job to see it here</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-white/[0.06]">
                  {upcomingJobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => router.push(`/jobs/${job.id}`)}
                      className="w-full text-left flex items-start gap-3 px-4 py-3.5 active:bg-white/[0.04] transition-colors min-h-[64px]"
                    >
                      <div className="flex-shrink-0 w-20 pt-0.5">
                        <span className="text-white/50 text-[12px] font-medium">
                          {formatRelativeDate(job.scheduledDate)}
                        </span>
                        <span className="text-white/30 text-[11px] block mt-0.5">
                          {formatJobTime(job.scheduledDate)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-white text-[14px] font-semibold truncate">
                            <CustomerName customerId={job.customerId} />
                          </span>
                          <StatusBadge status={job.status} />
                        </div>
                        <span className="text-white/50 text-[12px] block truncate">
                          {formatServiceType(job.serviceType)}
                        </span>
                        {job.address ? (
                          <span className="text-white/35 text-[12px] block truncate mt-0.5">
                            {job.address}
                          </span>
                        ) : null}
                      </div>
                      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="text-white/30 flex-shrink-0 mt-1" aria-hidden="true">
                        <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Day View ──────────────────────────────────────────────────── */}
          {viewMode === "day" && (
            <div className="mx-4 mt-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
              {dayJobs.length === 0 ? (
                <div className="px-4 py-12 flex flex-col items-center gap-2">
                  <p className="text-white/30 text-[15px] font-medium">No jobs scheduled</p>
                  <p className="text-white/20 text-[13px]">Nothing on the books for this day</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-white/[0.06]">
                  {dayJobs
                    .slice()
                    .sort((a, b) =>
                      (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? "")
                    )
                    .map((job) => (
                      <DayJobCard
                        key={job.id}
                        job={job}
                        onClick={() => router.push(`/jobs/${job.id}`)}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* ── Week View ─────────────────────────────────────────────────── */}
          {viewMode === "week" && (
            <div className="mx-4 mt-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
              {Array.from({ length: 7 }).map((_, i) => {
                const day = addDays(weekStart, i);
                const dayStartIso = startOfDay(day).toISOString();
                const dayEndIso = endOfDay(day).toISOString();
                const dayJobsList = weekJobs.filter(
                  (j) =>
                    j.scheduledDate >= dayStartIso &&
                    j.scheduledDate < dayEndIso
                );
                const firstJob = dayJobsList[0];
                const isCurrentDay = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDate);

                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedDate(day);
                      setViewMode("day");
                    }}
                    className={[
                      "w-full text-left flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.04] transition-colors min-h-[64px]",
                      i < 6 ? "border-b border-white/[0.06]" : "",
                      isSelected ? "bg-white/[0.04]" : "",
                    ].join(" ")}
                  >
                    {/* Day label */}
                    <div className="flex-shrink-0 w-12">
                      <div className={[
                        "text-[12px] font-semibold",
                        isCurrentDay ? "text-emerald-400" : "text-white/50",
                      ].join(" ")}>
                        {formatShortDay(day)}
                      </div>
                      <div className={[
                        "text-[14px] font-bold mt-0.5",
                        isCurrentDay ? "text-emerald-400" : "text-white/70",
                      ].join(" ")}>
                        {day.getDate()}
                      </div>
                    </div>

                    {/* Job info */}
                    <div className="flex-1 min-w-0">
                      {dayJobsList.length === 0 ? (
                        <span className="text-white/25 text-[13px]">No jobs</span>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-white/80 text-[13px] font-medium truncate">
                              <CustomerName customerId={firstJob.customerId} />
                            </span>
                            {dayJobsList.length > 1 && (
                              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex-shrink-0">
                                +{dayJobsList.length - 1}
                              </span>
                            )}
                          </div>
                          <span className="text-white/40 text-[12px] truncate block">
                            {formatServiceType(firstJob.serviceType)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Job count badge */}
                    {dayJobsList.length > 0 && (
                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        <span className="text-white/30 text-[12px] font-medium">
                          {dayJobsList.length} {dayJobsList.length === 1 ? "job" : "jobs"}
                        </span>
                        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/20" aria-hidden="true">
                          <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Month View ────────────────────────────────────────────────── */}
          {viewMode === "month" && (() => {
            // Build calendar grid
            const firstDay = startOfMonth(selectedDate);
            const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
            const daysInMonth = lastDay.getDate();
            // Start on Monday: 0=Mon..6=Sun
            const firstDayOfWeek = (firstDay.getDay() + 6) % 7;

            return (
              <div className="mx-4 mt-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="text-center text-white/30 text-[11px] font-semibold py-1">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Calendar cells */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells before first day */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}
                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1);
                    const dayStartIso = startOfDay(day).toISOString();
                    const dayEndIso = endOfDay(day).toISOString();
                    const dayJobCount = monthJobs.filter(
                      (j) => j.scheduledDate >= dayStartIso && j.scheduledDate < dayEndIso
                    ).length;
                    const isCurrentDay = isSameDay(day, today);

                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedDate(day);
                          setViewMode("day");
                        }}
                        className={[
                          "aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 active:bg-white/10 transition-colors",
                          isCurrentDay
                            ? "bg-emerald-500/15 border border-emerald-500/30"
                            : "bg-white/[0.04] border border-white/[0.04]",
                        ].join(" ")}
                      >
                        <span className={[
                          "text-[13px] font-semibold",
                          isCurrentDay ? "text-emerald-400" : "text-white/70",
                        ].join(" ")}>
                          {i + 1}
                        </span>
                        {dayJobCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/25 text-orange-300">
                            {dayJobCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Month job list below calendar */}
                {monthJobs.length > 0 && (
                  <div className="mt-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
                    <div className="px-4 pt-3 pb-2">
                      <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">
                        {monthJobs.length} {monthJobs.length === 1 ? "job" : "jobs"} this month
                      </p>
                    </div>
                    <div className="flex flex-col divide-y divide-white/[0.06]">
                      {monthJobs
                        .slice()
                        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
                        .map((job) => (
                          <button
                            key={job.id}
                            onClick={() => router.push(`/jobs/${job.id}`)}
                            className="w-full text-left flex items-start gap-3 px-4 py-3 active:bg-white/[0.04] transition-colors"
                          >
                            <div className="flex-shrink-0 w-16 pt-0.5">
                              <span className="text-white/50 text-[12px] font-medium">
                                {formatShortDate(new Date(job.scheduledDate))}
                              </span>
                              <span className="text-white/30 text-[11px] block mt-0.5">
                                {formatJobTime(job.scheduledDate)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-white text-[14px] font-semibold truncate block">
                                <CustomerName customerId={job.customerId} />
                              </span>
                              <span className="text-white/40 text-[12px] truncate block">
                                {formatServiceType(job.serviceType)}
                              </span>
                            </div>
                            <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="text-white/20 flex-shrink-0 mt-1" aria-hidden="true">
                              <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>
      {/* Floating Action Button */}
      <button
        onClick={() => setShowScheduleSheet(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-xl shadow-orange-900/40 flex items-center justify-center active:scale-95 transition-transform z-40"
        aria-label="Schedule a job"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </button>

      <ScheduleSheet
        open={showScheduleSheet}
        onClose={() => setShowScheduleSheet(false)}
        prefilledDate={selectedDate.toISOString().slice(0, 10)}
      />
    </AppShell>
  );
}

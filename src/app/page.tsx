"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { JobStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import AppShell from "@/components/AppShell";

function ScheduleIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="4" y="7" width="28" height="26" rx="4" stroke="currentColor" strokeWidth="2.2" fill="none"/>
      <path d="M12 4V10M24 4V10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M4 15H32" stroke="currentColor" strokeWidth="2.2"/>
      <rect x="10" y="20" width="5" height="5" rx="1" fill="currentColor"/>
      <rect x="21" y="20" width="5" height="5" rx="1" fill="currentColor"/>
    </svg>
  );
}

function CustomersIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="14" cy="12" r="5.5" stroke="currentColor" strokeWidth="2.2" fill="none"/>
      <path d="M4 31C4 25.477 8.477 21 14 21C16.21 21 18.252 21.756 19.876 23.03" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="26" cy="24" r="4.5" stroke="currentColor" strokeWidth="2.2" fill="none"/>
      <path d="M26 28.5V32" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M22 32H30" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8 4H22L32 14V32H8V4Z" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinejoin="round"/>
      <path d="M22 4V14H32" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/>
      <path d="M13 20H23" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M13 25H19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="18" cy="18" r="5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M18 15.5V18L19.5 19.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6" y="4" width="24" height="29" rx="4" stroke="currentColor" strokeWidth="2.2" fill="none"/>
      <rect x="10" y="8" width="16" height="7" rx="2" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="11.5" cy="21" r="1.5" fill="currentColor"/>
      <circle cx="18" cy="21" r="1.5" fill="currentColor"/>
      <circle cx="24.5" cy="21" r="1.5" fill="currentColor"/>
      <circle cx="11.5" cy="27" r="1.5" fill="currentColor"/>
      <circle cx="18" cy="27" r="1.5" fill="currentColor"/>
      <circle cx="24.5" cy="27" r="1.5" fill="currentColor"/>
    </svg>
  );
}

const TILES = [
  {
    label: "Schedule",
    href: "/schedule",
    icon: <ScheduleIcon />,
    gradient: "from-violet-600 to-indigo-700",
    glow: "shadow-violet-900/60",
    accent: "bg-violet-500/20",
    textColor: "text-violet-100",
  },
  {
    label: "Customers",
    href: "/customers",
    icon: <CustomersIcon />,
    gradient: "from-emerald-500 to-teal-700",
    glow: "shadow-emerald-900/60",
    accent: "bg-emerald-500/20",
    textColor: "text-emerald-100",
  },
  {
    label: "New Quote",
    href: "/quotes/new",
    icon: <QuoteIcon />,
    gradient: "from-orange-500 to-rose-600",
    glow: "shadow-orange-900/60",
    accent: "bg-orange-500/20",
    textColor: "text-orange-100",
  },
  {
    label: "Calculator",
    href: "/calculator",
    icon: <CalculatorIcon />,
    gradient: "from-sky-500 to-blue-700",
    glow: "shadow-sky-900/60",
    accent: "bg-sky-500/20",
    textColor: "text-sky-100",
  },
];

export default function HomePage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const openQuotesCount = useLiveQuery(
    () => db.jobs.where("status").equals(JobStatus.Quoted).count(),
    [],
    0
  );

  const monthlyRevenue = useLiveQuery(async () => {
    const paidJobs = await db.jobs
      .where("status")
      .equals(JobStatus.Paid)
      .toArray();

    const monthlyPaid = paidJobs.filter(
      (j) => j.scheduledDate >= monthStart && j.scheduledDate <= monthEnd
    );

    if (monthlyPaid.length === 0) return 0;

    let total = 0;
    for (const job of monthlyPaid) {
      const quote = await db.quotes.where("jobId").equals(job.id).first();
      if (quote) total += quote.totalPrice;
    }
    return total;
  }, [monthStart, monthEnd], 0);

  const completedThisMonth = useLiveQuery(async () => {
    const jobs = await db.jobs
      .where("status")
      .anyOf([JobStatus.Complete, JobStatus.Paid])
      .toArray();
    return jobs.filter(
      (j) => j.scheduledDate >= monthStart && j.scheduledDate <= monthEnd
    ).length;
  }, [monthStart, monthEnd], 0);

  const monthName = now.toLocaleString("en-US", { month: "long" });

  return (
    <AppShell>
      <div className="flex flex-col px-4 pb-8">
        {/* App header / logo area */}
        <div className="pt-8 pb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              {/* Paint roller icon */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-900/40">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="3" y="3" width="13" height="8" rx="2.5" stroke="white" strokeWidth="1.8" fill="none"/>
                  <path d="M9.5 11V15" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                  <rect x="7.5" y="15" width="4" height="4" rx="1" fill="white"/>
                  <path d="M16 7H19" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight leading-none">
                  Paint Tracker
                </h1>
                <p className="text-[13px] text-white/40 font-medium mt-0.5">
                  {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
          </div>

          {/* Settings link */}
          <Link
            href="/settings"
            className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center active:bg-white/15 transition-colors"
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M8.325 2.317a1.5 1.5 0 0 1 3.35 0l.143.953a1.1 1.1 0 0 0 1.544.834l.868-.422a1.5 1.5 0 0 1 1.675 2.438l-.725.531a1.1 1.1 0 0 0 0 1.698l.725.531a1.5 1.5 0 0 1-1.675 2.438l-.868-.422a1.1 1.1 0 0 0-1.544.834l-.143.953a1.5 1.5 0 0 1-3.35 0l-.143-.953a1.1 1.1 0 0 0-1.544-.834l-.868.422a1.5 1.5 0 0 1-1.675-2.438l.725-.531a1.1 1.1 0 0 0 0-1.698l-.725-.531A1.5 1.5 0 0 1 5.77 3.682l.868.422a1.1 1.1 0 0 0 1.544-.834l.143-.953Z" stroke="white" strokeWidth="1.4" fill="none"/>
              <circle cx="10" cy="10" r="2.5" stroke="white" strokeWidth="1.4" fill="none"/>
            </svg>
          </Link>
        </div>

        {/* Navigation tiles — 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className={`
                relative overflow-hidden rounded-3xl
                bg-gradient-to-br ${tile.gradient}
                shadow-xl ${tile.glow}
                active:scale-[0.97] transition-transform duration-150
                min-h-[150px] flex flex-col justify-between p-5
              `}
            >
              {/* Background shine */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl ${tile.accent} backdrop-blur-sm flex items-center justify-center ${tile.textColor}`}>
                {tile.icon}
              </div>

              {/* Label */}
              <div>
                <p className="text-white font-bold text-[18px] tracking-tight leading-none">
                  {tile.label}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-white/50 text-xs font-medium">Open</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="text-white/40">
                    <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick stats bar */}
        <div className="mt-4 rounded-3xl bg-white/[0.06] border border-white/[0.08] p-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
            {monthName} at a Glance
          </p>
          <div className="grid grid-cols-3 gap-2">
            {/* Open Quotes */}
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/[0.05] py-3 px-2">
              <span className="text-[26px] font-bold text-white leading-none tabular-nums">
                {openQuotesCount ?? 0}
              </span>
              <span className="text-[11px] text-white/50 font-medium text-center leading-snug">
                Open Quotes
              </span>
            </div>

            {/* Monthly Revenue */}
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/[0.05] py-3 px-2">
              <span className="text-[22px] font-bold text-emerald-400 leading-none tabular-nums">
                {monthlyRevenue != null ? formatCurrency(monthlyRevenue) : "—"}
              </span>
              <span className="text-[11px] text-white/50 font-medium text-center leading-snug">
                Revenue
              </span>
            </div>

            {/* Jobs Completed */}
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-white/[0.05] py-3 px-2">
              <span className="text-[26px] font-bold text-white leading-none tabular-nums">
                {completedThisMonth ?? 0}
              </span>
              <span className="text-[11px] text-white/50 font-medium text-center leading-snug">
                Completed
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

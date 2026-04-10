"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import { db } from "@/lib/db";
import { JobStatus } from "@/lib/types";
import { formatServiceType, formatJobStatus } from "@/lib/format";
import type { Job } from "@/lib/types";

function CustomerName({ customerId }: { customerId: string }) {
  const customer = useLiveQuery(
    () => db.customers.get(customerId),
    [customerId]
  );
  return <>{customer?.name ?? "..."}</>;
}

function formatDate(isoString: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function JobsListInner() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status");
  const unscheduledFilter = searchParams.get("unscheduled") === "true";

  const title = unscheduledFilter
    ? "Needs Scheduling"
    : statusFilter
    ? formatJobStatus(statusFilter as JobStatus)
    : "Jobs";

  const jobs = useLiveQuery(async () => {
    let results: Job[];

    if (unscheduledFilter) {
      const activeStatuses = [
        JobStatus.Lead,
        JobStatus.Quoted,
        JobStatus.Scheduled,
        JobStatus.InProgress,
      ];
      const allActive = await db.jobs
        .where("status")
        .anyOf(activeStatuses)
        .toArray();
      results = allActive.filter((j) => !j.scheduledDate);
    } else if (statusFilter) {
      results = await db.jobs
        .where("status")
        .equals(statusFilter)
        .toArray();
    } else {
      results = await db.jobs.orderBy("updatedAt").reverse().toArray();
    }

    results.sort(
      (a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
    );

    // Look up quote IDs for each job
    const withQuotes = await Promise.all(
      results.map(async (job) => {
        const quote = await db.quotes.where("jobId").equals(job.id).first();
        return { job, quoteId: quote?.id ?? null };
      })
    );

    return withQuotes;
  }, [statusFilter, unscheduledFilter]);

  return (
    <AppShell showBack title={title}>
      <div className="flex flex-col px-4 pt-4 pb-28">
        {(!jobs || jobs.length === 0) ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <p className="text-white/30 text-[15px] font-medium">No jobs found</p>
            <Link
              href="/quotes/new"
              className="text-orange-400 text-[14px] font-medium"
            >
              Create a new quote
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
            <div className="flex flex-col divide-y divide-white/[0.06]">
              {jobs.map(({ job, quoteId }) => (
                <Link
                  key={job.id}
                  href={quoteId ? `/quotes/${quoteId}` : `/jobs/${job.id}`}
                  className="flex items-center gap-3 px-4 py-4 active:bg-white/[0.04] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white text-[14px] font-semibold truncate">
                        <CustomerName customerId={job.customerId} />
                      </span>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="text-white/50 text-[12px]">
                      {formatServiceType(job.serviceType)}
                      {job.address && ` · ${job.address}`}
                    </p>
                    {job.scheduledDate && (
                      <p className="text-white/35 text-[12px] mt-0.5">
                        Scheduled: {formatDate(job.scheduledDate)}
                      </p>
                    )}
                    {!job.scheduledDate && unscheduledFilter && (
                      <p className="text-amber-400/60 text-[12px] mt-0.5">
                        Not yet scheduled
                      </p>
                    )}
                  </div>
                  <svg
                    width="7"
                    height="12"
                    viewBox="0 0 7 12"
                    fill="none"
                    className="text-white/20 flex-shrink-0"
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
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <AppShell showBack title="Jobs">
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-emerald-400 animate-spin" />
          </div>
        </AppShell>
      }
    >
      <JobsListInner />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { updateJob } from "@/hooks/useJobs";
import { formatServiceType } from "@/lib/format";
import type { Job } from "@/lib/types";

interface ScheduleSheetProps {
  open: boolean;
  onClose: () => void;
  prefilledDate: string; // YYYY-MM-DD from selected calendar day
}

function CustomerName({ customerId }: { customerId: string }) {
  const customer = useLiveQuery(
    () => db.customers.get(customerId),
    [customerId]
  );
  return <>{customer?.name ?? "..."}</>;
}

export default function ScheduleSheet({
  open,
  onClose,
  prefilledDate,
}: ScheduleSheetProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dateTimeValue, setDateTimeValue] = useState(`${prefilledDate}T09:00`);
  const [saving, setSaving] = useState(false);

  const unscheduledJobs = useLiveQuery(async () => {
    const allJobs = await db.jobs.toArray();
    return allJobs.filter((j) => !j.scheduledDate);
  }, []);

  async function handleSchedule() {
    if (!selectedJob || !dateTimeValue) return;
    setSaving(true);
    try {
      await updateJob(selectedJob.id, {
        scheduledDate: new Date(dateTimeValue).toISOString(),
      });
      setSelectedJob(null);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          setSelectedJob(null);
          onClose();
        }}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-[#1a1a2e] border-t border-white/[0.10] rounded-t-3xl px-5 pt-5 pb-8 max-h-[70vh] flex flex-col">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        <h2 className="text-white font-semibold text-[17px] mb-4">Schedule a Job</h2>

        {!selectedJob ? (
          <div className="flex-1 overflow-y-auto">
            {(!unscheduledJobs || unscheduledJobs.length === 0) ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <p className="text-white/40 text-[15px]">No unscheduled jobs</p>
                <a href="/quotes/new" className="text-orange-400 text-[14px] font-medium">
                  Create a new job
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {unscheduledJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      setSelectedJob(job);
                      setDateTimeValue(`${prefilledDate}T09:00`);
                    }}
                    className="w-full text-left flex items-center justify-between px-4 py-3.5 rounded-xl active:bg-white/[0.06] transition-colors"
                  >
                    <div>
                      <p className="text-white text-[14px] font-medium">
                        <CustomerName customerId={job.customerId} />
                      </p>
                      <p className="text-white/40 text-[12px] mt-0.5">
                        {formatServiceType(job.serviceType)}
                      </p>
                    </div>
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="text-white/30" aria-hidden="true">
                      <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-white/[0.06] px-4 py-3">
              <p className="text-white text-[14px] font-medium">
                <CustomerName customerId={selectedJob.customerId} />
              </p>
              <p className="text-white/40 text-[12px]">
                {formatServiceType(selectedJob.serviceType)}
              </p>
            </div>
            <div>
              <label className="block text-white/50 text-[12px] font-medium mb-1.5">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={dateTimeValue}
                onChange={(e) => setDateTimeValue(e.target.value)}
                className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white text-[15px] focus:outline-none focus:border-orange-500/60"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="flex-1 py-3.5 rounded-2xl bg-white/[0.08] text-white/70 font-medium text-[15px] active:bg-white/15 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSchedule}
                disabled={saving || !dateTimeValue}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-40 shadow-lg shadow-orange-900/30"
              >
                {saving ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

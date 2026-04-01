"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import AppShell from "@/components/AppShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import TemplatePicker from "@/components/TemplatePicker";
import StatusBadge from "@/components/StatusBadge";
import { useJob, updateJob } from "@/hooks/useJobs";
import { useQuote } from "@/hooks/useQuotes";
import { useCustomer } from "@/hooks/useCustomers";
import { db } from "@/lib/db";
import { JOB_STATUS_ORDER, JobStatus } from "@/lib/types";
import {
  formatCurrency,
  formatDateTime,
  formatServiceType,
  formatJobStatus,
} from "@/lib/format";

interface JobDetailClientProps {
  id: string;
}

export default function JobDetailClient({ id }: JobDetailClientProps) {
  const job = useJob(id);
  const quote = useQuote(id);
  const customer = useCustomer(job?.customerId ?? "");
  const existingActuals = useLiveQuery(
    () => db.actuals.where("jobId").equals(id).first(),
    [id]
  );

  // Notes state
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Scheduled date editing
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState("");

  // Status progression confirm dialog
  const [confirmStatus, setConfirmStatus] = useState<JobStatus | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Actuals form
  const [actualHours, setActualHours] = useState("");
  const [actualMaterials, setActualMaterials] = useState("");
  const [actualGallons, setActualGallons] = useState("");
  const [actualNotes, setActualNotes] = useState("");
  const [savingActuals, setSavingActuals] = useState(false);
  const [actualsSaved, setActualsSaved] = useState(false);

  // Sync notes when job loads
  useEffect(() => {
    if (job) {
      setNotes(job.notes ?? "");
    }
  }, [job?.id]);

  // Pre-fill actuals form when existingActuals loads
  useEffect(() => {
    if (existingActuals) {
      setActualHours(String(existingActuals.actualHours ?? ""));
      setActualMaterials(String(existingActuals.actualMaterialsCost ?? ""));
      setActualGallons(String(existingActuals.actualGallonsUsed ?? ""));
      setActualNotes(existingActuals.notes ?? "");
      setActualsSaved(true);
    }
  }, [existingActuals?.id]);

  async function handleNotesBlur() {
    if (!job) return;
    if (notes === (job.notes ?? "")) return;
    setSavingNotes(true);
    try {
      await updateJob(id, { notes });
    } finally {
      setSavingNotes(false);
    }
  }

  function getNextStatus(current: JobStatus): JobStatus | null {
    const idx = JOB_STATUS_ORDER.indexOf(current);
    if (idx === -1 || idx === JOB_STATUS_ORDER.length - 1) return null;
    return JOB_STATUS_ORDER[idx + 1];
  }

  async function handleStatusAdvance() {
    if (!job || !confirmStatus) return;
    await updateJob(id, { status: confirmStatus });
    setConfirmStatus(null);
  }

  function formatDateForInput(isoString: string): string {
    if (!isoString) return "";
    // datetime-local expects YYYY-MM-DDTHH:mm
    const d = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function startEditDate() {
    if (!job) return;
    setDateValue(formatDateForInput(job.scheduledDate));
    setEditingDate(true);
  }

  async function saveDateEdit() {
    if (!dateValue) {
      setEditingDate(false);
      return;
    }
    await updateJob(id, { scheduledDate: new Date(dateValue).toISOString() });
    setEditingDate(false);
  }

  async function saveActuals() {
    const hours = parseFloat(actualHours);
    const materials = parseFloat(actualMaterials);
    const gallons = parseFloat(actualGallons);

    if (isNaN(hours) || isNaN(materials) || isNaN(gallons)) return;

    setSavingActuals(true);
    try {
      const existingId = existingActuals?.id;
      await db.actuals.put({
        id: existingId ?? crypto.randomUUID(),
        jobId: id,
        actualHours: hours,
        actualMaterialsCost: materials,
        actualGallonsUsed: gallons,
        notes: actualNotes,
        completedAt: new Date().toISOString(),
      });
      setActualsSaved(true);
    } finally {
      setSavingActuals(false);
    }
  }

  function pctDiff(actual: number, quoted: number): string {
    if (!quoted) return "—";
    const diff = ((actual - quoted) / quoted) * 100;
    return `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
  }

  function pctColor(actual: number, quoted: number): string {
    if (!quoted) return "text-white/40";
    return actual <= quoted ? "text-green-400" : "text-rose-400";
  }

  // ── Loading state ──
  if (job === undefined) {
    return (
      <AppShell showBack title="Job">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-emerald-400 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (job === null) {
    return (
      <AppShell showBack title="Job">
        <div className="p-4 text-white/50 text-center py-16">Job not found.</div>
      </AppShell>
    );
  }

  const nextStatus = getNextStatus(job.status);
  const showActuals =
    job.status === JobStatus.Complete || job.status === JobStatus.Paid;

  // Quoted values for comparison
  const quotedHours = quote
    ? quote.totalLabor / (quote.laborRate || 1)
    : null;
  const quotedMaterials = quote ? quote.totalMaterials : null;

  return (
    <AppShell showBack title={formatServiceType(job.serviceType)}>
      <div className="flex flex-col px-4 pb-28 pt-4 gap-4">

        {/* ── Header: customer + address ── */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4 flex flex-col gap-1.5">
          {customer ? (
            <Link
              href={`/customers/${job.customerId}`}
              className="text-blue-400 text-[15px] font-semibold active:opacity-60 transition-opacity"
            >
              {customer.name}
            </Link>
          ) : (
            <span className="text-white/40 text-[15px]">Loading customer…</span>
          )}
          {job.address ? (
            <p className="text-white/60 text-[14px]">{job.address}</p>
          ) : null}
        </div>

        {/* ── Status Progression ── */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
          <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest mb-3">
            Status
          </h2>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {JOB_STATUS_ORDER.map((s, idx) => {
              const currentIdx = JOB_STATUS_ORDER.indexOf(job.status);
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isNext = idx === currentIdx + 1;

              return (
                <button
                  key={s}
                  disabled={!isNext}
                  onClick={() => isNext && setConfirmStatus(s)}
                  className={[
                    "flex-shrink-0 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all min-h-[34px] flex items-center",
                    isCurrent
                      ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/40"
                      : isPast
                      ? "bg-white/[0.05] text-white/30 border-white/[0.08]"
                      : isNext
                      ? "bg-blue-500/15 text-blue-300 border-blue-500/30 active:bg-blue-500/25 cursor-pointer"
                      : "bg-transparent text-white/20 border-white/[0.06]",
                  ].join(" ")}
                >
                  {formatJobStatus(s)}
                </button>
              );
            })}
          </div>
          {nextStatus && (
            <p className="text-white/40 text-[12px] mt-2">
              Tap{" "}
              <span className="text-blue-300">{formatJobStatus(nextStatus)}</span>{" "}
              to advance
            </p>
          )}
        </div>

        {/* ── Scheduled Date ── */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest">
              Scheduled
            </h2>
            {!editingDate && (
              <button
                onClick={startEditDate}
                className="text-emerald-400 text-[14px] font-medium active:opacity-60 transition-opacity py-1 px-2 -mr-2 min-h-[44px] flex items-center"
              >
                Edit
              </button>
            )}
          </div>
          {editingDate ? (
            <div className="flex flex-col gap-2 mt-2">
              <input
                type="datetime-local"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[15px] focus:outline-none focus:border-emerald-500/60"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingDate(false)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.08] text-white/70 font-medium text-[15px] active:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveDateEdit}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-white text-[15px] mt-1">
              {job.scheduledDate ? formatDateTime(job.scheduledDate) : (
                <span className="text-white/30">Not scheduled</span>
              )}
            </p>
          )}
        </div>

        {/* ── Notes ── */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest">
              Notes
            </h2>
            {savingNotes && (
              <span className="text-white/30 text-[12px]">Saving…</span>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add notes about this job…"
            rows={3}
            className="w-full bg-transparent text-white/80 text-[15px] placeholder-white/25 resize-none focus:outline-none leading-relaxed"
          />
        </div>

        {/* ── Quote Summary ── */}
        {quote && (
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
            <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest mb-3">
              Quote
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-[14px]">Total Price</span>
              <span className="text-white text-[18px] font-semibold">
                {formatCurrency(quote.totalPrice)}
              </span>
            </div>
            <Link
              href={`/quotes/${quote.id}`}
              className="mt-3 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-400 font-medium text-[14px] active:bg-orange-500/25 transition-colors"
            >
              View Full Quote
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        )}

        {/* ── Message Customer ── */}
        {customer && (
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-lg shadow-blue-900/30"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M3 2h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6l-4 3V3a1 1 0 0 1 1-1Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
            </svg>
            Message Customer
          </button>
        )}

        {/* ── Log Actuals ── */}
        {showActuals && (
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
            <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest mb-4">
              Log Actuals
            </h2>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-white/50 text-[12px] font-medium mb-1">
                  Hours Worked
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={actualHours}
                  onChange={(e) => setActualHours(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[15px] focus:outline-none focus:border-emerald-500/60 placeholder-white/25"
                />
              </div>
              <div>
                <label className="block text-white/50 text-[12px] font-medium mb-1">
                  Materials Cost ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={actualMaterials}
                  onChange={(e) => setActualMaterials(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[15px] focus:outline-none focus:border-emerald-500/60 placeholder-white/25"
                />
              </div>
              <div>
                <label className="block text-white/50 text-[12px] font-medium mb-1">
                  Gallons Used
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={actualGallons}
                  onChange={(e) => setActualGallons(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[15px] focus:outline-none focus:border-emerald-500/60 placeholder-white/25"
                />
              </div>
              <div>
                <label className="block text-white/50 text-[12px] font-medium mb-1">
                  Notes
                </label>
                <textarea
                  value={actualNotes}
                  onChange={(e) => setActualNotes(e.target.value)}
                  placeholder="Any notes about the completed job…"
                  rows={2}
                  className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[15px] focus:outline-none focus:border-emerald-500/60 placeholder-white/25 resize-none leading-relaxed"
                />
              </div>

              <button
                onClick={saveActuals}
                disabled={savingActuals || !actualHours || !actualMaterials || !actualGallons}
                className="w-full py-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-40 shadow-lg shadow-emerald-900/30"
              >
                {savingActuals ? "Saving…" : "Save Actuals"}
              </button>
            </div>

            {/* ── Quoted vs Actual Comparison ── */}
            {actualsSaved && existingActuals && (
              <div className="mt-5 pt-4 border-t border-white/[0.08]">
                <h3 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest mb-3">
                  Quoted vs Actual
                </h3>
                <div className="flex flex-col gap-2">
                  {/* Hours */}
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                    <span className="text-white/60 text-[13px]">Hours</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white/40 text-[12px]">
                        {quotedHours != null ? `${quotedHours.toFixed(1)} est` : "—"}
                      </span>
                      <span className="text-white text-[14px] font-medium">
                        {existingActuals.actualHours}h actual
                      </span>
                      {quotedHours != null && (
                        <span className={`text-[12px] font-semibold ${pctColor(existingActuals.actualHours, quotedHours)}`}>
                          {pctDiff(existingActuals.actualHours, quotedHours)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Materials */}
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                    <span className="text-white/60 text-[13px]">Materials</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white/40 text-[12px]">
                        {quotedMaterials != null ? `${formatCurrency(quotedMaterials)} est` : "—"}
                      </span>
                      <span className="text-white text-[14px] font-medium">
                        {formatCurrency(existingActuals.actualMaterialsCost)} actual
                      </span>
                      {quotedMaterials != null && (
                        <span className={`text-[12px] font-semibold ${pctColor(existingActuals.actualMaterialsCost, quotedMaterials)}`}>
                          {pctDiff(existingActuals.actualMaterialsCost, quotedMaterials)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Gallons */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-white/60 text-[13px]">Gallons</span>
                    <div className="flex items-center gap-3">
                      <span className="text-white/40 text-[12px]">—</span>
                      <span className="text-white text-[14px] font-medium">
                        {existingActuals.actualGallonsUsed} gal actual
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Confirm Status Dialog ── */}
      <ConfirmDialog
        open={confirmStatus !== null}
        title="Advance Status"
        message={`Move job to "${confirmStatus ? formatJobStatus(confirmStatus) : ""}"?`}
        onConfirm={handleStatusAdvance}
        onCancel={() => setConfirmStatus(null)}
      />

      {/* ── Template Picker ── */}
      {customer && (
        <TemplatePicker
          open={showTemplatePicker}
          onClose={() => setShowTemplatePicker(false)}
          customer={customer}
          job={job}
          quote={quote ?? undefined}
        />
      )}
    </AppShell>
  );
}

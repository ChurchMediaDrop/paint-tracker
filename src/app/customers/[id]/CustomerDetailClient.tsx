"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import TemplatePicker from "@/components/TemplatePicker";
import { useCustomer, updateCustomer, deleteCustomer } from "@/hooks/useCustomers";
import { useJobs } from "@/hooks/useJobs";
import { useQuote } from "@/hooks/useQuotes";
import { formatDate, formatServiceType, formatJobStatus } from "@/lib/format";
import { JobStatus } from "@/lib/types";

const STATUS_BADGE_STYLES: Record<JobStatus, string> = {
  [JobStatus.Lead]: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  [JobStatus.Quoted]: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  [JobStatus.Scheduled]: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  [JobStatus.InProgress]: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  [JobStatus.Complete]: "bg-green-500/20 text-green-300 border-green-500/30",
  [JobStatus.Paid]: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

interface CustomerDetailClientProps {
  id: string;
}

export default function CustomerDetailClient({ id }: CustomerDetailClientProps) {
  const router = useRouter();
  const customer = useCustomer(id);
  const jobs = useJobs({ customerId: id });

  const mostRecentJob = jobs[0] ?? null;
  const mostRecentQuote = useQuote(mostRecentJob?.id ?? "");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (customer) {
      setNotes(customer.notes ?? "");
    }
  }, [customer?.id]); // Only sync notes when customer ID changes (initial load)

  function startEdit() {
    if (!customer) return;
    setEditName(customer.name);
    setEditPhone(customer.phone ?? "");
    setEditEmail(customer.email ?? "");
    setEditAddress(customer.address ?? "");
    setEditError("");
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditError("");
  }

  async function saveEdit() {
    if (!editName.trim()) {
      setEditError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      await updateCustomer(id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
      });
      setIsEditing(false);
    } catch {
      setEditError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleNotesBlur() {
    if (!customer) return;
    if (notes === customer.notes) return;
    setSavingNotes(true);
    try {
      await updateCustomer(id, { notes });
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete() {
    await deleteCustomer(id);
    router.replace("/customers");
  }

  if (customer === undefined) {
    return (
      <AppShell showBack title="Customer">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-emerald-400 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (customer === null) {
    return (
      <AppShell showBack title="Customer">
        <div className="p-4 text-white/50 text-center py-16">Customer not found.</div>
      </AppShell>
    );
  }

  const hasJobs = jobs.length > 0;

  return (
    <AppShell showBack title={customer.name}>
      <div className="flex flex-col px-4 pb-28 pt-4 gap-4">

        {/* Contact Info Card */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest">
              Contact
            </h2>
            {!isEditing && (
              <button
                onClick={startEdit}
                className="text-emerald-400 text-[14px] font-medium active:opacity-60 transition-opacity py-1 px-2 -mr-2 min-h-[44px] flex items-center"
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="px-4 pb-4 flex flex-col gap-3">
              <div>
                <label className="block text-white/50 text-[12px] font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => { setEditName(e.target.value); setEditError(""); }}
                  className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[15px] focus:outline-none focus:border-emerald-500/60"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-white/50 text-[12px] font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[15px] focus:outline-none focus:border-emerald-500/60"
                />
              </div>
              <div>
                <label className="block text-white/50 text-[12px] font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[15px] focus:outline-none focus:border-emerald-500/60"
                />
              </div>
              <div>
                <label className="block text-white/50 text-[12px] font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-3 py-2.5 text-white text-[15px] focus:outline-none focus:border-emerald-500/60"
                />
              </div>
              {editError && <p className="text-rose-400 text-[13px]">{editError}</p>}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={cancelEdit}
                  className="flex-1 py-3 rounded-xl bg-white/[0.08] text-white/70 font-medium text-[15px] active:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 pb-4 flex flex-col gap-3">
              {customer.phone ? (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-3 min-h-[44px] group"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-emerald-400" aria-hidden="true">
                      <path d="M2 2h3.5l1 3.5-1.75 1.25A8.5 8.5 0 0 0 10.25 12.25L11.5 10.5 15 11.5V15C9 15.5 1.5 9 2 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </div>
                  <span className="text-emerald-400 text-[15px] font-medium group-active:opacity-60">
                    {customer.phone}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-3 min-h-[44px]">
                  <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/30" aria-hidden="true">
                      <path d="M2 2h3.5l1 3.5-1.75 1.25A8.5 8.5 0 0 0 10.25 12.25L11.5 10.5 15 11.5V15C9 15.5 1.5 9 2 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </div>
                  <span className="text-white/30 text-[15px]">No phone</span>
                </div>
              )}

              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center gap-3 min-h-[44px] group"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-400" aria-hidden="true">
                      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M1.5 5L8 9.5L14.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-blue-400 text-[15px] font-medium group-active:opacity-60 truncate">
                    {customer.email}
                  </span>
                </a>
              ) : (
                <div className="flex items-center gap-3 min-h-[44px]">
                  <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/30" aria-hidden="true">
                      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M1.5 5L8 9.5L14.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-white/30 text-[15px]">No email</span>
                </div>
              )}

              {customer.address ? (
                <div className="flex items-center gap-3 min-h-[44px]">
                  <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-orange-400" aria-hidden="true">
                      <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.485-2.015-4.5-4.5-4.5Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <circle cx="8" cy="6" r="1.5" fill="currentColor"/>
                    </svg>
                  </div>
                  <span className="text-white text-[15px]">{customer.address}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 min-h-[44px]">
                  <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/30" aria-hidden="true">
                      <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.485-2.015-4.5-4.5-4.5Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <circle cx="8" cy="6" r="1.5" fill="currentColor"/>
                    </svg>
                  </div>
                  <span className="text-white/30 text-[15px]">No address</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes Card */}
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
            placeholder="Add notes about this customer…"
            rows={3}
            className="w-full bg-transparent text-white/80 text-[15px] placeholder-white/25 resize-none focus:outline-none leading-relaxed"
          />
        </div>

        {/* Job History */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-white/60 text-[12px] font-semibold uppercase tracking-widest">
              Job History
            </h2>
          </div>

          {jobs.length === 0 ? (
            <div className="px-4 pb-4 text-white/30 text-[14px]">No jobs yet.</div>
          ) : (
            <div className="flex flex-col">
              {jobs.map((job, idx) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className={`flex items-center justify-between px-4 py-3.5 active:bg-white/[0.04] transition-colors min-h-[56px] ${idx < jobs.length - 1 ? "border-b border-white/[0.06]" : ""}`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-white text-[14px] font-medium truncate">
                      {formatServiceType(job.serviceType)}
                    </span>
                    <span className="text-white/40 text-[12px]">
                      {formatDate(job.scheduledDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE_STYLES[job.status]}`}>
                      {formatJobStatus(job.status)}
                    </span>
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/30" aria-hidden="true">
                      <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* New Quote button */}
        <Link
          href={`/quotes/new?customerId=${id}`}
          className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-lg shadow-orange-900/30"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M9 3V15M3 9H15" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
          New Quote
        </Link>

        {/* Send Message button */}
        {mostRecentJob && (
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-lg shadow-blue-900/30"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M3 2h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6l-4 3V3a1 1 0 0 1 1-1Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
            </svg>
            Send Message
          </button>
        )}

        {/* Delete Customer */}
        {!hasJobs && (
          <div className="mt-2">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium text-[15px] active:bg-rose-500/20 transition-colors"
              >
                Delete Customer
              </button>
            ) : (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex flex-col gap-3">
                <p className="text-rose-300 text-[14px] text-center font-medium">
                  Delete {customer.name}? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 rounded-xl bg-white/[0.08] text-white/70 font-medium text-[14px] active:bg-white/15 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-semibold text-[14px] active:bg-rose-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template Picker */}
      {mostRecentJob && (
        <TemplatePicker
          open={showTemplatePicker}
          onClose={() => setShowTemplatePicker(false)}
          customer={customer}
          job={mostRecentJob}
          quote={mostRecentQuote ?? undefined}
        />
      )}
    </AppShell>
  );
}

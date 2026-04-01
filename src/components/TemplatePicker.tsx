"use client";

import { useState } from "react";
import { useMessageTemplates } from "@/hooks/useSettings";
import { renderTemplate, buildSmsUrl, buildMailtoUrl } from "@/lib/message-templates";
import { formatCurrency, formatDate, formatServiceType } from "@/lib/format";
import type { Customer, Job, Quote, MessageTemplate } from "@/lib/types";

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  customer: Customer;
  job: Job;
  quote: Quote | undefined;
}

export default function TemplatePicker({ open, onClose, customer, job, quote }: TemplatePickerProps) {
  const templates = useMessageTemplates();
  const [selected, setSelected] = useState<MessageTemplate | null>(null);

  if (!open) return null;

  const templateValues = {
    customer_name: customer.name,
    service_type: formatServiceType(job.serviceType),
    job_total: formatCurrency(quote?.totalPrice ?? 0),
    scheduled_date: formatDate(job.scheduledDate),
    job_address: job.address,
  };

  function handleSelect(t: MessageTemplate) {
    setSelected(t);
  }

  function handleBack() {
    setSelected(null);
  }

  function handleClose() {
    setSelected(null);
    onClose();
  }

  const renderedBody = selected ? renderTemplate(selected.body, templateValues) : "";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[#111] border-t border-white/[0.08] flex flex-col max-h-[85vh]">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {selected && (
              <button
                onClick={handleBack}
                className="text-blue-400 text-[15px] font-medium active:opacity-60 transition-opacity flex items-center gap-1 min-h-[44px] -ml-1 pr-2"
              >
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M7 1L1 7L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back
              </button>
            )}
            <h2 className="text-white font-semibold text-[17px]">
              {selected ? selected.name : "Send Message"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.08] text-white/60 active:bg-white/15 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            /* Template list */
            <div className="flex flex-col py-2">
              {templates.length === 0 ? (
                <p className="text-white/40 text-[14px] text-center py-10 px-5">
                  No templates yet. Add templates in Settings.
                </p>
              ) : (
                templates.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    className={[
                      "flex items-center gap-4 px-5 py-4 active:bg-white/[0.04] transition-colors text-left min-h-[64px]",
                      idx < templates.length - 1 ? "border-b border-white/[0.05]" : "",
                    ].join(" ")}
                  >
                    {/* Channel badge */}
                    <div
                      className={[
                        "flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
                        t.channel === "sms"
                          ? "bg-green-500/15 text-green-300 border-green-500/25"
                          : "bg-blue-500/15 text-blue-300 border-blue-500/25",
                      ].join(" ")}
                    >
                      {t.channel === "sms" ? "SMS" : "Email"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-[15px] font-medium truncate">{t.name}</p>
                      <p className="text-white/40 text-[13px] truncate mt-0.5">{t.body}</p>
                    </div>
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/30 flex-shrink-0" aria-hidden="true">
                      <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Preview + send */
            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Recipient */}
              <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-3">
                <p className="text-white/50 text-[12px] font-semibold uppercase tracking-widest mb-1">To</p>
                <p className="text-white text-[15px] font-medium">{customer.name}</p>
                {selected.channel === "sms" && customer.phone && (
                  <p className="text-white/50 text-[13px]">{customer.phone}</p>
                )}
                {selected.channel === "email" && customer.email && (
                  <p className="text-white/50 text-[13px]">{customer.email}</p>
                )}
              </div>

              {/* Preview */}
              <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
                <p className="text-white/50 text-[12px] font-semibold uppercase tracking-widest mb-3">Preview</p>
                {selected.channel === "email" && selected.subject && (
                  <p className="text-white/70 text-[13px] font-medium mb-2">
                    Subject: {selected.subject}
                  </p>
                )}
                <p className="text-white text-[15px] leading-relaxed whitespace-pre-wrap">
                  {renderedBody}
                </p>
              </div>

              {/* Send buttons */}
              <div className="flex flex-col gap-2 pb-6">
                {selected.channel === "sms" ? (
                  <a
                    href={buildSmsUrl(customer.phone, renderedBody)}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-lg shadow-green-900/30"
                    onClick={handleClose}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M3 2h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6l-4 3V3a1 1 0 0 1 1-1Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
                    </svg>
                    Send SMS
                  </a>
                ) : (
                  <a
                    href={buildMailtoUrl(
                      customer.email,
                      selected.subject || "Quote from Paint Tracker",
                      renderedBody
                    )}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-lg shadow-blue-900/30"
                    onClick={handleClose}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <rect x="2" y="4" width="14" height="10" rx="1.5" stroke="white" strokeWidth="1.6" fill="none"/>
                      <path d="M2 6l7 5 7-5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                    Send Email
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

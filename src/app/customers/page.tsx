"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useCustomers, createCustomer } from "@/hooks/useCustomers";
import { useJobs } from "@/hooks/useJobs";
import { formatDate } from "@/lib/format";
import type { Customer } from "@/lib/types";

function CustomerRow({ customer }: { customer: Customer }) {
  const router = useRouter();
  const jobs = useJobs({ customerId: customer.id });
  const lastJob = jobs.length > 0 ? jobs[0] : null;

  return (
    <button
      onClick={() => router.push(`/customers/${customer.id}`)}
      className="w-full flex items-center justify-between px-4 py-4 bg-white/[0.06] border border-white/[0.08] rounded-2xl active:bg-white/10 transition-colors text-left min-h-[64px]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">
            {customer.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-[15px] leading-snug truncate">
            {customer.name}
          </p>
          {customer.phone && (
            <p className="text-white/50 text-[13px] truncate">{customer.phone}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {lastJob && (
          <span className="text-white/40 text-[12px]">
            {formatDate(lastJob.scheduledDate)}
          </span>
        )}
        <svg width="8" height="13" viewBox="0 0 8 13" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/30" aria-hidden="true">
          <path d="M1 1L7 6.5L1 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

function AddCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const id = await createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        notes: "",
      });
      onCreated(id);
      router.push(`/customers/${id}`);
    } catch {
      setError("Failed to save customer. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[#111] border border-white/10 rounded-t-3xl p-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-[17px]">New Customer</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M1 1L13 13M13 1L1 13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-white/60 text-[13px] font-medium mb-1.5" htmlFor="new-customer-name">
              Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="new-customer-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="Full name"
              className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 text-[15px] focus:outline-none focus:border-emerald-500/60 focus:bg-white/10"
              autoFocus
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-white/60 text-[13px] font-medium mb-1.5" htmlFor="new-customer-phone">
              Phone
            </label>
            <input
              id="new-customer-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 000-0000"
              className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 text-[15px] focus:outline-none focus:border-emerald-500/60 focus:bg-white/10"
            />
          </div>
          <div>
            <label className="block text-white/60 text-[13px] font-medium mb-1.5" htmlFor="new-customer-email">
              Email
            </label>
            <input
              id="new-customer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 text-[15px] focus:outline-none focus:border-emerald-500/60 focus:bg-white/10"
            />
          </div>
          <div>
            <label className="block text-white/60 text-[13px] font-medium mb-1.5" htmlFor="new-customer-address">
              Address
            </label>
            <input
              id="new-customer-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
              className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 text-[15px] focus:outline-none focus:border-emerald-500/60 focus:bg-white/10"
            />
          </div>
          {error && (
            <p className="text-rose-400 text-[13px] font-medium">{error}</p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="mt-2 w-full py-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-semibold text-[16px] active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-emerald-900/40"
          >
            {saving ? "Saving…" : "Add Customer"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const customers = useCustomers(search || undefined);

  return (
    <AppShell showBack title="Customers">
      <div className="flex flex-col px-4 pb-24 pt-4 gap-3">
        {/* Search bar */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M11.5 11.5L15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full bg-white/[0.08] border border-white/[0.10] rounded-2xl pl-10 pr-4 py-3.5 text-white placeholder-white/30 text-[15px] focus:outline-none focus:border-emerald-500/50 focus:bg-white/10"
          />
        </div>

        {/* Customer list */}
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-white/[0.06] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/30" aria-hidden="true">
                <circle cx="13" cy="11" r="5" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M3 28C3 22.477 7.477 18 13 18C15.21 18 17.252 18.756 18.876 20.03" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="24" cy="22" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M24 26V29" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M20 29H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-white/40 text-[15px] font-medium text-center px-8">
              {search ? `No customers found for "${search}"` : "No customers yet. Add your first customer!"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {customers.map((c) => (
              <CustomerRow key={c.id} customer={c} />
            ))}
          </div>
        )}
      </div>

      {/* Floating Add button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-8 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-xl shadow-emerald-900/50 active:scale-95 transition-transform"
        aria-label="Add Customer"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M11 4V18M4 11H18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </button>

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onCreated={() => setShowAdd(false)}
        />
      )}
    </AppShell>
  );
}

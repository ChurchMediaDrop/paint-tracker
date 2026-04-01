"use client";

import { useState } from "react";
import { useCustomers, createCustomer } from "@/hooks/useCustomers";
import type { Customer } from "@/lib/types";

interface CustomerPickerProps {
  onSelect: (customerId: string) => void;
}

function CustomerRow({
  customer,
  onSelect,
}: {
  customer: Customer;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(customer.id)}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-white/[0.05] hover:bg-white/10 active:bg-white/10 border border-white/[0.08] rounded-2xl transition-colors text-left min-h-[56px]"
    >
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">
          {customer.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-white font-medium text-[15px] leading-snug truncate">
          {customer.name}
        </p>
        {customer.phone && (
          <p className="text-white/40 text-[13px] truncate">{customer.phone}</p>
        )}
      </div>
    </button>
  );
}

function NewCustomerForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
        email: "",
        address: address.trim(),
        notes: "",
      });
      onCreated(id);
    } catch {
      setError("Failed to save customer. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-3">
      <div>
        <label className="block text-white/50 text-[12px] font-medium mb-1.5" htmlFor="cp-name">
          Name <span className="text-rose-400">*</span>
        </label>
        <input
          id="cp-name"
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
        <label className="block text-white/50 text-[12px] font-medium mb-1.5" htmlFor="cp-phone">
          Phone
        </label>
        <input
          id="cp-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 000-0000"
          className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 text-[15px] focus:outline-none focus:border-emerald-500/60 focus:bg-white/10"
        />
      </div>
      <div>
        <label className="block text-white/50 text-[12px] font-medium mb-1.5" htmlFor="cp-address">
          Address
        </label>
        <input
          id="cp-address"
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
        className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-emerald-900/30"
      >
        {saving ? "Saving…" : "Add Customer"}
      </button>
    </form>
  );
}

export default function CustomerPicker({ onSelect }: CustomerPickerProps) {
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const customers = useCustomers(search || undefined);

  function handleCreated(id: string) {
    onSelect(id);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Add New Customer button */}
      {!showNewForm && (
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 w-full px-4 py-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.10] border-dashed active:bg-white/10 transition-colors min-h-[52px]"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-emerald-400" aria-hidden="true">
              <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-emerald-400 font-medium text-[15px]">Add New Customer</span>
        </button>
      )}

      {showNewForm && (
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.10] px-4 py-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-semibold text-[15px]">New Customer</h3>
            <button
              onClick={() => setShowNewForm(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
              aria-label="Cancel"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M1 1L11 11M11 1L1 11" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <NewCustomerForm onCreated={handleCreated} />
        </div>
      )}

      {/* Search */}
      {!showNewForm && (
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="w-full bg-white/[0.08] border border-white/[0.10] rounded-2xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-[15px] focus:outline-none focus:border-emerald-500/50 focus:bg-white/10"
          />
        </div>
      )}

      {/* Customer list */}
      {!showNewForm && (
        <div className="flex flex-col gap-2">
          {customers.length === 0 ? (
            <p className="text-white/30 text-[14px] text-center py-4">
              {search ? `No customers found for "${search}"` : "No customers yet."}
            </p>
          ) : (
            customers.map((c) => (
              <CustomerRow key={c.id} customer={c} onSelect={onSelect} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

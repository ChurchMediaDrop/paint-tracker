"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import RoomForm from "@/components/RoomForm";
import QuoteSummary from "@/components/QuoteSummary";
import TemplatePicker from "@/components/TemplatePicker";
import {
  useQuoteById,
  useRooms,
  addRoom,
  deleteRoom,
  updateRoom,
  updateQuote,
  recalculateQuoteTotals,
} from "@/hooks/useQuotes";
import { useJob } from "@/hooks/useJobs";
import { useCustomer } from "@/hooks/useCustomers";
import { formatServiceType } from "@/lib/format";
import type { Room } from "@/lib/types";

interface QuoteDetailClientProps {
  id: string;
}

export default function QuoteDetailClient({ id }: QuoteDetailClientProps) {
  const quote = useQuoteById(id);
  const rooms = useRooms(id);
  const job = useJob(quote?.jobId ?? "");
  const customer = useCustomer(job?.customerId ?? "");

  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  async function handleRoomSave(roomData: Omit<Room, "id" | "updatedAt">) {
    if (editingRoom) {
      await updateRoom(editingRoom.id, { ...roomData });
    } else {
      await addRoom({ ...roomData, quoteId: id });
    }
    await recalculateQuoteTotals(id);
    setShowRoomForm(false);
    setEditingRoom(null);
  }

  function handleEditRoom(room: Room) {
    setEditingRoom(room);
    setShowRoomForm(true);
  }

  function handleCancelForm() {
    setShowRoomForm(false);
    setEditingRoom(null);
  }

  async function handleDeleteRoom(roomId: string) {
    setDeletingRoomId(roomId);
    try {
      await deleteRoom(roomId);
      await recalculateQuoteTotals(id);
    } finally {
      setDeletingRoomId(null);
    }
  }

  async function handleMarkupChange(percent: number) {
    if (!quote) return;
    await updateQuote(id, { markupPercent: percent });
    await recalculateQuoteTotals(id);
  }

  async function handleLaborRateChange(rate: number) {
    if (!quote) return;
    await updateQuote(id, { laborRate: rate });
    await recalculateQuoteTotals(id);
  }

  if (quote === undefined) {
    return (
      <AppShell showBack title="Quote">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-orange-400 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (quote === null) {
    return (
      <AppShell showBack title="Quote">
        <div className="p-4 text-white/50 text-center py-16">Quote not found.</div>
      </AppShell>
    );
  }

  return (
    <AppShell showBack title="Quote">
      <div className="flex flex-col px-4 pb-28 pt-4 gap-4">

        {/* Header info */}
        <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {customer && (
                <p className="text-white font-semibold text-[17px] truncate">{customer.name}</p>
              )}
              {job && (
                <p className="text-white/50 text-[14px] mt-0.5">
                  {formatServiceType(job.serviceType)}
                </p>
              )}
            </div>
            {job && (
              <Link
                href={`/jobs/${job.id}`}
                className="flex-shrink-0 text-blue-400 text-[14px] font-medium active:opacity-60 transition-opacity py-1"
              >
                View Job
              </Link>
            )}
          </div>
        </div>

        {/* Quote Summary */}
        <QuoteSummary
          quote={quote}
          rooms={rooms}
          onMarkupChange={handleMarkupChange}
          onLaborRateChange={handleLaborRateChange}
        />

        {/* Room actions */}
        {showRoomForm ? (
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-4">
            <h3 className="text-white font-semibold text-[15px] mb-4">
              {editingRoom ? "Edit Room" : "New Room"}
            </h3>
            {job && (
              <RoomForm
                serviceType={job.serviceType}
                laborRate={quote.laborRate}
                quoteId={id}
                onSave={handleRoomSave}
                onCancel={handleCancelForm}
                editRoom={editingRoom ?? undefined}
              />
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowRoomForm(true)}
            className="flex items-center gap-3 w-full px-4 py-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] border-dashed active:bg-white/10 transition-colors min-h-[60px]"
          >
            <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-orange-400" aria-hidden="true">
                <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-orange-400 font-medium text-[15px]">Add Room / Area</span>
          </button>
        )}

        {/* Manage rooms */}
        {!showRoomForm && rooms.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-white/40 text-[12px] font-semibold uppercase tracking-widest">Manage Rooms</p>
            {rooms.map((room) => {
              const total = (room.materialCost || room.manualCost || 0) + (room.laborCost || 0);
              return (
                <div
                  key={room.id}
                  className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-3.5 flex items-center justify-between gap-3"
                >
                  <button
                    onClick={() => handleEditRoom(room)}
                    className="min-w-0 text-left flex-1 active:opacity-60 transition-opacity"
                  >
                    <p className="text-white text-[14px] font-medium truncate">{room.name}</p>
                    <p className="text-white/40 text-[12px] mt-0.5">
                      {formatServiceType(room.serviceType)}
                      {room.paintColor && ` · ${room.paintColor}`}
                    </p>
                  </button>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-white text-[14px] font-semibold">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total)}
                    </span>
                    {/* Edit button */}
                    <button
                      onClick={() => handleEditRoom(room)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-400 active:bg-blue-500/30 transition-colors"
                      aria-label="Edit room"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      disabled={deletingRoomId === room.id}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-500/15 border border-rose-500/20 text-rose-400 active:bg-rose-500/30 transition-colors disabled:opacity-50"
                      aria-label="Remove room"
                    >
                      {deletingRoomId === room.id ? (
                        <div className="w-3 h-3 rounded-full border border-rose-400/40 border-t-rose-400 animate-spin" />
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Send Quote */}
        {!showRoomForm && job && customer && (
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold text-[15px] active:scale-[0.98] transition-transform shadow-lg shadow-blue-900/30 mt-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="2" y="4" width="14" height="10" rx="1.5" stroke="white" strokeWidth="1.6" fill="none"/>
              <path d="M2 6l7 5 7-5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            Send Quote
          </button>
        )}
      </div>

      {/* Template Picker */}
      {job && customer && (
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
